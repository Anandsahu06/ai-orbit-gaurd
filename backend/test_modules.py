import requests
import re
import os

base = 'http://127.0.0.1:5173'
visited = set()
queue = ['/src/main.tsx', '/src/App.tsx']
errors = []

while queue:
    curr = queue.pop(0)
    if curr in visited:
        continue
    visited.add(curr)
    url = base + curr if curr.startswith('/') else base + '/' + curr
    try:
        r = requests.get(url)
        if r.status_code != 200:
            errors.append((curr, r.status_code, r.text[:200]))
            print(f"ERROR: {curr} -> {r.status_code}")
        else:
            imports = re.findall(r'from\s+["\']([^"\']+)["\']', r.text)
            imports += re.findall(r'import\s+["\']([^"\']+)["\']', r.text)
            for imp in imports:
                if imp.startswith('.') or imp.startswith('/src') or imp.startswith('/node_modules'):
                    resolved = imp
                    if not resolved.startswith('/'):
                        d = os.path.dirname(curr)
                        resolved = os.path.normpath(os.path.join(d, imp)).replace('\\', '/')
                    if resolved not in visited and resolved not in queue:
                        queue.append(resolved)
    except Exception as e:
        errors.append((curr, 'EXC', str(e)))

print(f"Visited {len(visited)} modules. Total errors: {len(errors)}")
for err in errors:
    print("Error:", err)
