# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Paper2Code** is a multi-agent LLM system that transforms scientific papers into functional code repositories. The system follows a three-stage pipeline: **planning**, **analysis**, and **code generation**, each handled by specialized agents. This is the official implementation of the [Paper2Code paper](https://arxiv.org/abs/2504.17192).

## Development Commands

### Environment Setup
```bash
# Install OpenAI dependencies for GPT-based models
pip install openai>=1.65.4

# Install vLLM dependencies for open-source models  
pip install vllm>=0.6.4.post1

# Install all dependencies
pip install -r requirements.txt

# Set OpenAI API key (required for GPT models)
export OPENAI_API_KEY="<your-api-key>"
```

### Running PaperCoder

#### With OpenAI Models (o3-mini, estimated cost $0.50-$0.70)
```bash
cd scripts
bash run.sh              # For PDF-based JSON input
bash run_latex.sh        # For LaTeX source input
```

#### With Open Source Models (DeepSeek-Coder-V2-Lite-Instruct)
```bash
cd scripts  
bash run_llm.sh          # For PDF-based JSON input
bash run_latex_llm.sh    # For LaTeX source input
```

### Evaluation Commands
```bash
# Install evaluation dependencies
pip install tiktoken

# Reference-free evaluation
cd codes/
python eval.py \
    --paper_name Transformer \
    --pdf_json_path ../examples/Transformer_cleaned.json \
    --data_dir ../data \
    --output_dir ../outputs/Transformer \
    --target_repo_dir ../outputs/Transformer_repo \
    --eval_result_dir ../results \
    --eval_type ref_free \
    --generated_n 8 \
    --papercoder

# Reference-based evaluation (requires gold repository)
python eval.py \
    --paper_name Transformer \
    --pdf_json_path ../examples/Transformer_cleaned.json \
    --data_dir ../data \
    --output_dir ../outputs/Transformer \
    --target_repo_dir ../outputs/Transformer_repo \
    --gold_repo_dir ../examples/Transformer_gold_repo \
    --eval_result_dir ../results \
    --eval_type ref_based \
    --generated_n 8 \
    --papercoder
```

## Architecture Overview

The system operates through a sequential three-stage pipeline:

### Stage 1: Planning (`1_planning.py` / `1_planning_llm.py`)
- Analyzes the input paper (JSON or LaTeX format)
- Generates high-level implementation plan and project structure
- Outputs planning artifacts and configuration to `outputs/{paper_name}/planning_artifacts/`
- Configuration extracted via `1.1_extract_config.py` into `planning_config.yaml`

### Stage 2: Analysis (`2_analyzing.py` / `2_analyzing_llm.py`)  
- Takes planning artifacts as input
- Performs detailed technical analysis of paper methods
- Identifies key algorithms, data structures, and implementation details
- Outputs analysis artifacts to `outputs/{paper_name}/analyzing_artifacts/`

### Stage 3: Code Generation (`3_coding.py` / `3_coding_llm.py`)
- Uses planning and analysis artifacts to generate actual code
- Creates complete repository structure with implementation
- Outputs final repository to `outputs/{paper_name}_repo/`
- Includes config.yaml copied from planning stage

### File Structure
```
codes/
├── 0_pdf_process.py         # PDF to JSON preprocessing  
├── 1_planning.py           # Planning with OpenAI models
├── 1_planning_llm.py       # Planning with open-source models
├── 1.1_extract_config.py   # Extract planning configuration
├── 2_analyzing.py          # Analysis with OpenAI models
├── 2_analyzing_llm.py      # Analysis with open-source models  
├── 3_coding.py             # Code generation with OpenAI models
├── 3_coding_llm.py         # Code generation with open-source models
├── eval.py                 # Repository evaluation
└── utils.py                # Shared utilities and helper functions

scripts/
├── run.sh                  # Run with OpenAI models (PDF input)
├── run_latex.sh            # Run with OpenAI models (LaTeX input)  
├── run_llm.sh              # Run with open-source models (PDF input)
└── run_latex_llm.sh        # Run with open-source models (LaTeX input)
```

## Key Concepts

### Input Formats
- **JSON**: Preprocessed PDF using s2orc-doc2json toolkit (recommended)
- **LaTeX**: Direct LaTeX source files from papers

### Model Types  
- **OpenAI**: Uses `o3-mini` by default (configurable via `GPT_VERSION`)
- **Open Source**: Uses `deepseek-ai/DeepSeek-Coder-V2-Lite-Instruct` by default via vLLM

### Output Structure
```
outputs/
├── {paper_name}/
│   ├── planning_artifacts/    # Stage 1 outputs
│   ├── analyzing_artifacts/   # Stage 2 outputs  
│   └── coding_artifacts/      # Stage 3 outputs
└── {paper_name}_repo/         # Final generated repository
```

### Evaluation System
- Model-based evaluation using o3-mini-high across 8 samples
- Supports both reference-free and reference-based evaluation
- Generates 1-5 correctness scores with detailed critiques
- Used for Paper2Code benchmark with 90 papers from top ML conferences

## Customization

To run on custom papers:
1. Convert PDF to JSON using s2orc-doc2json (optional if you have LaTeX)
2. Modify environment variables in script files:
   - `PAPER_NAME`: Name identifier for your paper
   - `PDF_JSON_PATH`: Path to preprocessed JSON
   - `OUTPUT_DIR`: Directory for intermediate artifacts
   - `OUTPUT_REPO_DIR`: Directory for final repository
3. Run appropriate script based on your model preference

The system is designed to be modular - each stage can be run independently if you have the required input artifacts from previous stages.