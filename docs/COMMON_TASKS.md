# Common Tasks

Quick reference for frequently needed tasks.

## Starting the Application

### Quick Start
```bash
# Terminal 1
./start-backend.sh

# Terminal 2
cd frontend && npm start
```

### Manual Start
```bash
# Terminal 1 - Backend
source venv/bin/activate
python app.py

# Terminal 2 - Frontend
cd frontend
npm start
```

## Fetching Programs

### Via Browser (Interactive)
1. Go to http://localhost:8000/docs
2. Find POST /api/fetch
3. Click "Try it out"
4. Click "Execute"

### Via Command Line (cURL)
```bash
# Yesterday's programs
curl -X POST "http://localhost:8000/api/fetch?date_path=Вчера"

# Today's programs
curl -X POST "http://localhost:8000/api/fetch?date_path=Днес"

# Tomorrow's programs
curl -X POST "http://localhost:8000/api/fetch?date_path=Утре"
```

### Via Python
```python
from app import ActiveChannelFetcher
fetcher = ActiveChannelFetcher()
data = fetcher.fetch_all_programs('Вчера')
print(data)
```

## Checking Data

### Check if programs exist for a date
```bash
ls -la data/programs/2025-12-18.json
```

### View programs for a date
```bash
cat data/programs/2025-12-18.json | python -m json.tool
```

### Get all available dates
```bash
ls -1 data/programs/*.json | xargs -n1 basename | sed 's/.json//'
```

### Check file sizes
```bash
du -h data/programs/*.json
```

## Managing Channels

### Toggle a channel (via API)
```bash
curl -X POST "http://localhost:8000/api/channels/bnt/toggle"
```

### Get all channels
```bash
curl "http://localhost:8000/api/channels" | python -m json.tool
```

### Get active channels only
```bash
curl "http://localhost:8000/api/channels/active" | python -m json.tool
```

### Edit channel config directly
```bash
# View the file
cat tv_channels.json

# Edit it (use your editor)
nano tv_channels.json  # or vim, code, etc.

# Verify syntax
python -m json.tool tv_channels.json > /dev/null && echo "Valid JSON"
```

## Cleaning Up

### Delete old program files manually
```bash
# Delete programs older than 7 days
find data/programs -name "*.json" -mtime +7 -delete

# Or delete all program files
rm -rf data/programs/*
```

### Clear frontend build cache
```bash
cd frontend
npm cache clean --force
rm -rf node_modules
npm install
```

### Clear Python cache
```bash
find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null
```

## Development Tasks

### Install new Python package
```bash
source venv/bin/activate
pip install package-name
pip freeze > requirements.txt
```

### Install new frontend package
```bash
cd frontend
npm install package-name
# or for dev dependencies
npm install --save-dev package-name
```

### Check Python syntax
```bash
python -m py_compile app.py
python -m py_compile fetch_active_programs.py
```

### Format Python code
```bash
# Install formatter
pip install black

# Format app.py
black app.py
```

### Lint TypeScript
```bash
cd frontend
npm run build  # This will check for TypeScript errors
```

## Troubleshooting Tasks

### Check if ports are in use
```bash
# Check port 8000 (backend)
lsof -i :8000

# Check port 3000 (frontend)
lsof -i :3000

# Kill process if needed
kill -9 <PID>
```

### Test API endpoints
```bash
# Test if backend is running
curl http://localhost:8000/

# Test if API is responding
curl http://localhost:8000/api/status

# Test programs endpoint
curl "http://localhost:8000/api/programs?date=2025-12-18"
```

### View API documentation
```bash
# Open in browser
http://localhost:8000/docs

# Or get raw OpenAPI spec
curl http://localhost:8000/openapi.json
```

### Check frontend console
1. Open http://localhost:3000
2. Press F12 to open DevTools
3. Click "Console" tab
4. Look for red errors

### Check backend logs
- Look at terminal where backend is running
- Check for error messages
- Check status code responses

## Scheduling Tasks

### Set up daily fetch with cron (Linux/Mac)
```bash
# Edit crontab
crontab -e

# Add this line (2 AM daily)
0 2 * * * curl -X POST "http://localhost:8000/api/fetch?date_path=Вчера"

# List your cron jobs
crontab -l

# Remove specific job
crontab -e  # then delete the line
```

### Create a shell script for scheduling
```bash
# Create fetch.sh
cat > fetch.sh << 'EOF'
#!/bin/bash
curl -X POST "http://localhost:8000/api/fetch?date_path=Вчера"
EOF

chmod +x fetch.sh

# Then use in cron:
# 0 2 * * * /path/to/fetch.sh
```

### Test cron job timing
```bash
# Run your cron command manually
curl -X POST "http://localhost:8000/api/fetch?date_path=Вчера"

# Check cron logs (Mac)
log stream --predicate 'process == "cron"' --level debug

# Check cron logs (Linux)
grep CRON /var/log/syslog
```

## Backup & Recovery

### Backup program data
```bash
# Create backup
tar -czf programs_backup.tar.gz data/programs/

# Or just copy directory
cp -r data/programs data/programs_backup

# List backups
ls -lh *backup*
```

### Backup channel configuration
```bash
# Copy the config
cp tv_channels.json tv_channels.json.backup

# Or keep git tracking it
git add tv_channels.json
git commit -m "Backup: channel config"
```

### Restore from backup
```bash
# Extract backup
tar -xzf programs_backup.tar.gz

# Or copy from backup
cp tv_channels.json.backup tv_channels.json
```

## Git Tasks

### Check status
```bash
git status
```

### Commit changes
```bash
git add .
git commit -m "Description of changes"
```

### View recent commits
```bash
git log --oneline -10
```

### See what changed
```bash
git diff
git diff HEAD~1  # Compare to previous commit
```

## Performance Monitoring

### Check memory usage
```bash
# Check Python process
ps aux | grep python

# Check Node process
ps aux | grep node
```

### Check disk usage
```bash
# How much space do programs use?
du -sh data/programs/

# How many program files?
ls -1 data/programs/*.json | wc -l

# Largest programs file
ls -lhS data/programs/*.json | head -1
```

### Check API response time
```bash
# Time the API call
time curl -X POST "http://localhost:8000/api/fetch?date_path=Вчера"

# Or use curl timing
curl -w "@curl-format.txt" -o /dev/null -s "http://localhost:8000/"
```

## Advanced Tasks

### Export programs to CSV
```bash
python -c "
import json
import csv

with open('data/programs/2025-12-18.json') as f:
    data = json.load(f)

with open('export.csv', 'w', newline='', encoding='utf-8') as f:
    writer = csv.writer(f)
    writer.writerow(['Channel', 'Time', 'Title', 'Description'])

    for channel_id, ch_data in data['programs'].items():
        for prog in ch_data['programs']:
            writer.writerow([
                ch_data['channel']['name'],
                prog['time'],
                prog['title'],
                prog.get('description', '')
            ])

print('Exported to export.csv')
"
```

### Get statistics
```bash
# Count programs by channel
python -c "
import json
from collections import defaultdict

with open('data/programs/2025-12-18.json') as f:
    data = json.load(f)

counts = {}
for ch_id, ch_data in data['programs'].items():
    counts[ch_data['channel']['name']] = len(ch_data['programs'])

for ch, count in sorted(counts.items(), key=lambda x: x[1], reverse=True):
    print(f'{ch}: {count} programs')
"
```

### Monitor for changes
```bash
# Watch a directory
watch -n 5 'ls -la data/programs/'

# Or check periodically
while true; do
  echo "Checking $(date)"
  ls data/programs/*.json | wc -l
  sleep 300  # Check every 5 minutes
done
```

## Quick Reference Commands

| Task | Command |
|------|---------|
| Start app | `./start-backend.sh` & `cd frontend && npm start` |
| Fetch programs | `curl -X POST "http://localhost:8000/api/fetch?date_path=Вчера"` |
| View API docs | http://localhost:8000/docs |
| Frontend URL | http://localhost:3000 |
| Check status | `curl http://localhost:8000/api/status` |
| List programs | `curl http://localhost:8000/api/programs/7days` |
| Get channels | `curl http://localhost:8000/api/channels` |
| View file | `cat data/programs/2025-12-18.json \| python -m json.tool` |
| Kill port 8000 | `lsof -i :8000 \| grep LISTEN \| awk '{print $2}' \| xargs kill` |
| Kill port 3000 | `lsof -i :3000 \| grep LISTEN \| awk '{print $2}' \| xargs kill` |
| Backup data | `tar -czf backup.tar.gz data/programs/` |
| Clean old data | `find data/programs -name "*.json" -mtime +7 -delete` |

## Need Help?

- Check **README.md** for full documentation
- Check **GETTING_STARTED.md** for setup help
- Check **ARCHITECTURE.md** for system design
- Review code comments in source files
- Check browser console (F12) for frontend errors
- Check terminal output for backend errors
