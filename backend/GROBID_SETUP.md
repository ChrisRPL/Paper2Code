# Grobid Service Setup for Paper2Code

## Overview
Grobid is a machine learning library for extracting and parsing bibliographic information from scholarly documents. Paper2Code uses Grobid to enhance PDF processing capabilities, providing better extraction of:
- Paper titles and abstracts
- Author information
- References and citations
- Mathematical formulas
- Figure and table captions
- Section structure

## Quick Start with Docker

### 1. Start Grobid Service
From the project root directory:

```bash
# Start Grobid service
docker-compose up -d grobid

# Verify Grobid is running
curl http://localhost:8070/api/isalive
```

### 2. Stop Grobid Service
```bash
docker-compose down grobid
```

## Manual Setup (Alternative)

If you prefer not to use Docker:

### 1. Download Grobid
```bash
wget https://github.com/kermitt2/grobid/archive/0.7.3.zip
unzip 0.7.3.zip
cd grobid-0.7.3
```

### 2. Build Grobid
```bash
./gradlew clean install
```

### 3. Run Grobid Service
```bash
./gradlew run
```

## Configuration

### Environment Variables
Add to your `.env` file:
```env
GROBID_URL=http://localhost:8070
```

### Docker Configuration
The `docker-compose.yml` includes:
- Grobid service on port 8070
- Health checks for service monitoring
- Persistent volume for Grobid data
- Automatic restart policy

## API Endpoints

### Check Service Health
```bash
GET http://localhost:8070/api/isalive
```

### Process Full PDF Document
```bash
POST http://localhost:8070/api/processFulltextDocument
Content-Type: multipart/form-data
Body: PDF file
```

### Get Version Information
```bash
GET http://localhost:8070/api/version
```

## Integration with Paper2Code

The FileManagerService automatically:
1. Checks if Grobid is available
2. Falls back to s2orc-doc2json if Grobid is unavailable
3. Processes PDFs with enhanced extraction when Grobid is running

### Usage in Code
```python
# The service automatically detects and uses Grobid
file_manager = FileManagerService()

# Check if Grobid is available
is_available = await file_manager._check_grobid_service()

# Process PDF with Grobid (if available)
tei_xml_path = await file_manager.process_pdf_with_grobid(pdf_path)
```

## Troubleshooting

### Port Already in Use
If port 8070 is already in use:
```bash
# Find process using port 8070
lsof -i :8070

# Kill the process
kill -9 <PID>
```

### Docker Issues
```bash
# View Grobid logs
docker logs paper2code_grobid

# Restart Grobid service
docker-compose restart grobid

# Remove and recreate
docker-compose down grobid
docker-compose up -d grobid
```

### Memory Issues
Grobid requires at least 2GB of RAM. If you encounter memory issues:
1. Increase Docker memory allocation
2. Or modify docker-compose.yml to add memory limits:
```yaml
grobid:
  ...
  deploy:
    resources:
      limits:
        memory: 4G
```

## Benefits of Using Grobid

1. **Better Structure Extraction**: Accurately identifies paper sections, subsections, and hierarchy
2. **Mathematical Formula Parsing**: Extracts and preserves mathematical notation
3. **Reference Extraction**: Identifies and parses bibliography entries
4. **Table and Figure Detection**: Locates and extracts captions and references
5. **Metadata Extraction**: Retrieves author names, affiliations, and paper metadata
6. **Multi-language Support**: Handles papers in various languages

## Additional Resources

- [Grobid Documentation](https://grobid.readthedocs.io/)
- [Grobid GitHub Repository](https://github.com/kermitt2/grobid)
- [Grobid REST API](https://grobid.readthedocs.io/en/latest/Grobid-service/)