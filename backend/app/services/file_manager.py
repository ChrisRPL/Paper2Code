"""
File management service for PDF uploads and processing
"""

import os
import aiofiles
import aiofiles.os
import shutil
import subprocess
import asyncio
from pathlib import Path
from typing import Optional
from fastapi import UploadFile
import uuid
import logging

from ..core.config import settings
from ..schemas.upload import FileValidationResult

logger = logging.getLogger(__name__)

class FileManagerService:
    """Service for managing file uploads, validation, and PDF conversion"""
    
    def __init__(self):
        self.upload_dir = Path(settings.UPLOAD_DIR)
        self.temp_dir = Path(settings.TEMP_DIR)
        self.output_dir = Path(settings.OUTPUT_DIR)
        self.s2orc_path = Path(settings.PAPER_CODER_CODES_DIR).parent / "external" / "s2orc-doc2json"
        
        # Ensure directories exist
        self.upload_dir.mkdir(parents=True, exist_ok=True)
        self.temp_dir.mkdir(parents=True, exist_ok=True)
        self.output_dir.mkdir(parents=True, exist_ok=True)
    
    async def validate_pdf_file(self, file: UploadFile) -> FileValidationResult:
        """
        Validate uploaded PDF file
        """
        try:
            # Check file extension
            if not file.filename.lower().endswith('.pdf'):
                return FileValidationResult(
                    is_valid=False,
                    error="File must be a PDF"
                )
            
            # Check content type
            if file.content_type != 'application/pdf':
                return FileValidationResult(
                    is_valid=False,
                    error=f"Invalid content type: {file.content_type}. Expected: application/pdf"
                )
            
            # Check file size
            contents = await file.read()
            file_size = len(contents)
            
            max_size = settings.MAX_FILE_SIZE_MB * 1024 * 1024  # Convert MB to bytes
            if file_size > max_size:
                return FileValidationResult(
                    is_valid=False,
                    error=f"File size {file_size} bytes exceeds maximum allowed size of {max_size} bytes"
                )
            
            # Reset file position for later reading
            await file.seek(0)
            
            # Basic PDF header check
            header = contents[:4]
            if header != b'%PDF':
                return FileValidationResult(
                    is_valid=False,
                    error="Invalid PDF file format"
                )
            
            return FileValidationResult(
                is_valid=True,
                file_size=file_size,
                file_type="application/pdf"
            )
            
        except Exception as e:
            logger.error(f"Error validating PDF file: {e}")
            return FileValidationResult(
                is_valid=False,
                error=f"Validation error: {str(e)}"
            )
    
    async def save_uploaded_file(self, file: UploadFile, file_id: str) -> str:
        """
        Save uploaded file to storage directory
        """
        try:
            # Create file path with unique ID
            file_extension = Path(file.filename).suffix
            safe_filename = f"{file_id}{file_extension}"
            file_path = self.upload_dir / safe_filename
            
            # Save file contents
            async with aiofiles.open(file_path, 'wb') as f:
                contents = await file.read()
                await f.write(contents)
            
            logger.info(f"File saved successfully: {file_path}")
            return str(file_path)
            
        except Exception as e:
            logger.error(f"Error saving uploaded file: {e}")
            raise Exception(f"Failed to save file: {str(e)}")
    
    async def convert_pdf_to_json(self, pdf_path: str) -> str:
        """
        Convert PDF to JSON using s2orc-doc2json
        """
        try:
            pdf_path_obj = Path(pdf_path)
            if not pdf_path_obj.exists():
                raise FileNotFoundError(f"PDF file not found: {pdf_path}")
            
            # Create output directory for this conversion
            conversion_id = str(uuid.uuid4())
            temp_conversion_dir = self.temp_dir / f"conversion_{conversion_id}"
            output_conversion_dir = self.output_dir / f"pdf_json_{conversion_id}"
            
            temp_conversion_dir.mkdir(parents=True, exist_ok=True)
            output_conversion_dir.mkdir(parents=True, exist_ok=True)
            
            # Check if Grobid service is running (basic check)
            grobid_health = await self._check_grobid_service()
            if not grobid_health:
                logger.warning("Grobid service not detected, attempting to start...")
                # In production, you might want to start Grobid automatically
                # For now, we'll raise an error
                raise Exception("Grobid service not available. Please start Grobid service on port 8070")
            
            # Run s2orc PDF processing
            process_script = self.s2orc_path / "doc2json" / "grobid2json" / "process_pdf.py"
            
            if not process_script.exists():
                raise FileNotFoundError(f"s2orc processing script not found: {process_script}")
            
            cmd = [
                "python", str(process_script),
                "-i", str(pdf_path),
                "-t", str(temp_conversion_dir),
                "-o", str(output_conversion_dir)
            ]
            
            logger.info(f"Running PDF to JSON conversion: {' '.join(cmd)}")
            
            # Run conversion process
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=str(self.s2orc_path)
            )
            
            stdout, stderr = await process.communicate()
            
            if process.returncode != 0:
                error_msg = stderr.decode() if stderr else "Unknown error"
                logger.error(f"PDF conversion failed: {error_msg}")
                raise Exception(f"PDF to JSON conversion failed: {error_msg}")
            
            # Find generated JSON file
            json_files = list(output_conversion_dir.glob("*.json"))
            if not json_files:
                raise Exception("No JSON file generated from PDF conversion")
            
            json_file_path = str(json_files[0])
            logger.info(f"PDF converted successfully to: {json_file_path}")
            
            # Cleanup temporary directory
            await asyncio.create_subprocess_exec("rm", "-rf", str(temp_conversion_dir))
            
            return json_file_path
            
        except Exception as e:
            logger.error(f"Error converting PDF to JSON: {e}")
            raise Exception(f"PDF conversion failed: {str(e)}")
    
    async def _check_grobid_service(self) -> bool:
        """
        Check if Grobid service is running on port 8070
        """
        try:
            import httpx
            async with httpx.AsyncClient() as client:
                response = await client.get("http://localhost:8070/api/version", timeout=5.0)
                return response.status_code == 200
        except Exception:
            return False
    
    async def delete_file(self, file_id: str):
        """
        Delete a file by its ID
        """
        try:
            # Find file with this ID
            for file_path in self.upload_dir.glob(f"{file_id}.*"):
                await aiofiles.os.remove(file_path)
                logger.info(f"File deleted: {file_path}")
                return
            
            raise FileNotFoundError(f"File with ID {file_id} not found")
            
        except Exception as e:
            logger.error(f"Error deleting file: {e}")
            raise
    
    async def cleanup_job_files(self, job_id: str):
        """
        Clean up all files associated with a job
        """
        try:
            # Clean upload files
            for file_path in self.upload_dir.glob(f"{job_id}.*"):
                await aiofiles.os.remove(file_path)
            
            # Clean temp files
            for dir_path in self.temp_dir.glob(f"*{job_id}*"):
                if dir_path.is_dir():
                    shutil.rmtree(dir_path)
            
            logger.info(f"Cleaned up files for job: {job_id}")
            
        except Exception as e:
            logger.error(f"Error cleaning up job files: {e}")
    
    def get_file_info(self, file_path: str) -> dict:
        """
        Get information about a file
        """
        try:
            path_obj = Path(file_path)
            if not path_obj.exists():
                raise FileNotFoundError(f"File not found: {file_path}")
            
            stat = path_obj.stat()
            return {
                "filename": path_obj.name,
                "size": stat.st_size,
                "modified": stat.st_mtime,
                "exists": True
            }
            
        except Exception as e:
            return {
                "filename": None,
                "size": 0,
                "modified": None,
                "exists": False,
                "error": str(e)
            }