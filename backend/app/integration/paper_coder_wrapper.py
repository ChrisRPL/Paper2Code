"""
Paper2Code integration wrapper for orchestrating the 3-stage processing pipeline
"""

import asyncio
import subprocess
import os
import sys
from pathlib import Path
from typing import Optional, List, Dict, Any
import json
import logging
from datetime import datetime

from ..core.config import settings
from ..services.job_tracker import JobTrackerService
from ..services.websocket_manager import WebSocketManagerService
from ..models.job import JobStatus, ProcessingStage
from ..schemas.job import JobUpdateRequest

logger = logging.getLogger(__name__)

class Paper2CodeWrapper:
    """
    Wrapper for integrating existing Paper2Code system with web interface
    """
    
    def __init__(self, websocket_manager: WebSocketManagerService):
        self.websocket_manager = websocket_manager
        self.job_tracker = JobTrackerService()
        
        # Paths to existing Paper2Code components
        self.codes_dir = Path(settings.PAPER_CODER_CODES_DIR)
        self.scripts_dir = Path(settings.PAPER_CODER_SCRIPTS_DIR)
        self.output_base_dir = Path(settings.PAPER_CODER_OUTPUT_BASE_DIR)
        
        # Validate paths exist
        self._validate_paths()
    
    def _validate_paths(self):
        """Validate that required Paper2Code directories exist"""
        required_paths = [
            (self.codes_dir, "codes directory"),
            (self.scripts_dir, "scripts directory"),
        ]
        
        for path, description in required_paths:
            if not path.exists():
                logger.error(f"Paper2Code {description} not found: {path}")
                raise FileNotFoundError(f"Required Paper2Code {description} not found: {path}")
        
        logger.info("Paper2Code paths validated successfully")
    
    async def process_paper(
        self, 
        job_id: str, 
        pdf_json_path: str,
        paper_name: Optional[str] = None
    ) -> str:
        """
        Main orchestration function for the 3-stage Paper2Code pipeline
        """
        try:
            # Use job_id as paper name if not provided
            if not paper_name:
                paper_name = f"paper_{job_id[:8]}"
            
            # Notify job started
            await self.websocket_manager.send_job_started(job_id, paper_name, "preprocessing")
            await self.job_tracker.update_job_progress(job_id, ProcessingStage.PREPROCESSING, 10)
            
            # Create output directories
            paper_output_dir = self.output_base_dir / paper_name
            paper_repo_dir = self.output_base_dir / f"{paper_name}_repo"
            
            paper_output_dir.mkdir(parents=True, exist_ok=True)
            paper_repo_dir.mkdir(parents=True, exist_ok=True)
            
            processing_logs = []
            
            # Stage 1: Planning
            logger.info(f"Starting planning stage for job {job_id}")
            await self.websocket_manager.send_job_progress(job_id, "planning", 20, "Starting planning stage...")
            await self.job_tracker.update_job_progress(job_id, ProcessingStage.PLANNING, 20)
            
            planning_result = await self._run_planning_stage(
                job_id, pdf_json_path, paper_name, paper_output_dir
            )
            processing_logs.extend(planning_result.get("logs", []))
            
            # Stage 2: Analysis
            logger.info(f"Starting analysis stage for job {job_id}")
            await self.websocket_manager.send_job_progress(job_id, "analysis", 50, "Starting analysis stage...")
            await self.job_tracker.update_job_progress(job_id, ProcessingStage.ANALYSIS, 50)
            
            analysis_result = await self._run_analysis_stage(
                job_id, pdf_json_path, paper_name, paper_output_dir
            )
            processing_logs.extend(analysis_result.get("logs", []))
            
            # Stage 3: Coding
            logger.info(f"Starting coding stage for job {job_id}")
            await self.websocket_manager.send_job_progress(job_id, "coding", 80, "Starting code generation...")
            await self.job_tracker.update_job_progress(job_id, ProcessingStage.CODING, 80)
            
            coding_result = await self._run_coding_stage(
                job_id, pdf_json_path, paper_name, paper_output_dir, paper_repo_dir
            )
            processing_logs.extend(coding_result.get("logs", []))
            
            # Complete job
            repository_path = str(paper_repo_dir)
            await self.job_tracker.complete_job(job_id, repository_path, processing_logs)
            await self.websocket_manager.send_job_completed(job_id, repository_path)
            
            logger.info(f"Paper2Code processing completed for job {job_id}")
            return repository_path
            
        except Exception as e:
            error_message = f"Paper2Code processing failed: {str(e)}"
            logger.error(error_message)
            
            await self.job_tracker.fail_job(job_id, error_message)
            await self.websocket_manager.send_job_error(job_id, error_message)
            
            raise Exception(error_message)
    
    async def _run_planning_stage(
        self, 
        job_id: str,
        pdf_json_path: str, 
        paper_name: str,
        output_dir: Path
    ) -> Dict[str, Any]:
        """
        Execute the planning stage of Paper2Code
        """
        try:
            # Determine which planning script to use based on OpenAI API availability
            planning_script = "1_planning.py"  # Default to OpenAI version
            if not os.getenv("OPENAI_API_KEY"):
                planning_script = "1_planning_llm.py"  # Use open-source version
                logger.info("No OpenAI API key found, using open-source model for planning")
            
            # Set up environment variables for the planning stage
            env = os.environ.copy()
            env.update({
                "PDF_JSON_PATH": pdf_json_path,
                "PAPER_NAME": paper_name,
                "OUTPUT_DIR": str(output_dir),
            })
            
            # Run planning stage
            cmd = [
                sys.executable,
                str(self.codes_dir / planning_script),
                "--pdf_json_path", pdf_json_path,
                "--data_dir", str(self.codes_dir.parent / "data"),
                "--output_dir", str(output_dir),
                "--paper_name", paper_name
            ]
            
            result = await self._run_subprocess(cmd, env, f"Planning stage for {paper_name}")
            
            # Send progress updates
            await self.websocket_manager.send_job_progress(job_id, "planning", 35, "Planning stage completed")
            
            # Check for planning artifacts
            planning_artifacts_dir = output_dir / "planning_artifacts"
            if planning_artifacts_dir.exists():
                artifacts = list(planning_artifacts_dir.glob("*"))
                logger.info(f"Planning stage generated {len(artifacts)} artifacts")
                
                # Send artifact information via WebSocket
                await self.websocket_manager.send_job_artifact(
                    job_id, 
                    "planning",
                    "planning_artifacts",
                    {"artifact_count": len(artifacts), "artifacts": [str(a.name) for a in artifacts]}
                )
            
            return {
                "success": result["success"],
                "logs": result["logs"],
                "artifacts_dir": str(planning_artifacts_dir) if planning_artifacts_dir.exists() else None
            }
            
        except Exception as e:
            logger.error(f"Planning stage failed: {e}")
            raise Exception(f"Planning stage failed: {str(e)}")
    
    async def _run_analysis_stage(
        self,
        job_id: str,
        pdf_json_path: str,
        paper_name: str, 
        output_dir: Path
    ) -> Dict[str, Any]:
        """
        Execute the analysis stage of Paper2Code
        """
        try:
            # Determine which analysis script to use
            analysis_script = "2_analyzing.py"
            if not os.getenv("OPENAI_API_KEY"):
                analysis_script = "2_analyzing_llm.py"
                logger.info("Using open-source model for analysis")
            
            # Set up environment
            env = os.environ.copy()
            env.update({
                "PDF_JSON_PATH": pdf_json_path,
                "PAPER_NAME": paper_name,
                "OUTPUT_DIR": str(output_dir),
            })
            
            cmd = [
                sys.executable,
                str(self.codes_dir / analysis_script),
                "--pdf_json_path", pdf_json_path,
                "--data_dir", str(self.codes_dir.parent / "data"),
                "--output_dir", str(output_dir),
                "--paper_name", paper_name
            ]
            
            result = await self._run_subprocess(cmd, env, f"Analysis stage for {paper_name}")
            
            # Send progress updates
            await self.websocket_manager.send_job_progress(job_id, "analysis", 65, "Analysis stage completed")
            
            # Check for analysis artifacts
            analysis_artifacts_dir = output_dir / "analyzing_artifacts"
            if analysis_artifacts_dir.exists():
                artifacts = list(analysis_artifacts_dir.glob("*"))
                logger.info(f"Analysis stage generated {len(artifacts)} artifacts")
                
                await self.websocket_manager.send_job_artifact(
                    job_id,
                    "analysis", 
                    "analyzing_artifacts",
                    {"artifact_count": len(artifacts), "artifacts": [str(a.name) for a in artifacts]}
                )
            
            return {
                "success": result["success"],
                "logs": result["logs"],
                "artifacts_dir": str(analysis_artifacts_dir) if analysis_artifacts_dir.exists() else None
            }
            
        except Exception as e:
            logger.error(f"Analysis stage failed: {e}")
            raise Exception(f"Analysis stage failed: {str(e)}")
    
    async def _run_coding_stage(
        self,
        job_id: str,
        pdf_json_path: str,
        paper_name: str,
        output_dir: Path,
        repo_dir: Path
    ) -> Dict[str, Any]:
        """
        Execute the coding stage of Paper2Code
        """
        try:
            # Determine which coding script to use
            coding_script = "3_coding.py"
            if not os.getenv("OPENAI_API_KEY"):
                coding_script = "3_coding_llm.py"
                logger.info("Using open-source model for coding")
            
            # Set up environment
            env = os.environ.copy()
            env.update({
                "PDF_JSON_PATH": pdf_json_path,
                "PAPER_NAME": paper_name,
                "OUTPUT_DIR": str(output_dir),
                "OUTPUT_REPO_DIR": str(repo_dir),
            })
            
            cmd = [
                sys.executable,
                str(self.codes_dir / coding_script),
                "--pdf_json_path", pdf_json_path,
                "--data_dir", str(self.codes_dir.parent / "data"),
                "--output_dir", str(output_dir),
                "--target_repo_dir", str(repo_dir),
                "--paper_name", paper_name
            ]
            
            result = await self._run_subprocess(cmd, env, f"Coding stage for {paper_name}")
            
            # Send progress updates
            await self.websocket_manager.send_job_progress(job_id, "coding", 95, "Code generation completed")
            
            # Check for coding artifacts and generated repository
            coding_artifacts_dir = output_dir / "coding_artifacts"
            if coding_artifacts_dir.exists():
                artifacts = list(coding_artifacts_dir.glob("*"))
                logger.info(f"Coding stage generated {len(artifacts)} artifacts")
                
                await self.websocket_manager.send_job_artifact(
                    job_id,
                    "coding",
                    "coding_artifacts", 
                    {"artifact_count": len(artifacts), "artifacts": [str(a.name) for a in artifacts]}
                )
            
            # Check generated repository
            if repo_dir.exists():
                repo_files = list(repo_dir.rglob("*"))
                file_count = len([f for f in repo_files if f.is_file()])
                logger.info(f"Generated repository contains {file_count} files")
                
                await self.websocket_manager.send_job_artifact(
                    job_id,
                    "coding",
                    "generated_repository",
                    {"file_count": file_count, "repository_path": str(repo_dir)}
                )
            
            return {
                "success": result["success"],
                "logs": result["logs"],
                "repository_path": str(repo_dir)
            }
            
        except Exception as e:
            logger.error(f"Coding stage failed: {e}")
            raise Exception(f"Coding stage failed: {str(e)}")
    
    async def _run_subprocess(
        self, 
        cmd: List[str], 
        env: Dict[str, str], 
        description: str
    ) -> Dict[str, Any]:
        """
        Run a subprocess with proper logging and error handling
        """
        logger.info(f"Executing: {' '.join(cmd)}")
        
        try:
            # Run the subprocess
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env=env,
                cwd=str(self.codes_dir)
            )
            
            stdout, stderr = await process.communicate()
            
            # Process output
            stdout_text = stdout.decode('utf-8') if stdout else ""
            stderr_text = stderr.decode('utf-8') if stderr else ""
            
            logs = []
            if stdout_text:
                logs.append(f"STDOUT: {stdout_text}")
            if stderr_text:
                logs.append(f"STDERR: {stderr_text}")
            
            if process.returncode == 0:
                logger.info(f"{description} completed successfully")
                return {
                    "success": True,
                    "logs": logs,
                    "returncode": process.returncode
                }
            else:
                error_msg = f"{description} failed with return code {process.returncode}"
                if stderr_text:
                    error_msg += f": {stderr_text}"
                logger.error(error_msg)
                raise Exception(error_msg)
                
        except asyncio.TimeoutError:
            raise Exception(f"{description} timed out")
        except Exception as e:
            logger.error(f"{description} execution failed: {e}")
            raise Exception(f"{description} execution failed: {str(e)}")
    
    async def cancel_job(self, job_id: str) -> bool:
        """
        Cancel a running Paper2Code job
        Note: This is a simplified implementation - in production you might want
        to track and kill actual subprocesses
        """
        try:
            success = await self.job_tracker.cancel_job(job_id)
            if success:
                await self.websocket_manager.send_job_error(job_id, "Job cancelled by user")
            return success
            
        except Exception as e:
            logger.error(f"Error cancelling job {job_id}: {e}")
            return False
    
    def get_processing_status(self) -> Dict[str, Any]:
        """
        Get current processing status for monitoring
        """
        return {
            "codes_dir": str(self.codes_dir),
            "scripts_dir": str(self.scripts_dir),
            "output_base_dir": str(self.output_base_dir),
            "openai_api_available": bool(os.getenv("OPENAI_API_KEY")),
            "websocket_connections": self.websocket_manager.get_connection_count(),
            "timestamp": datetime.utcnow().isoformat()
        }