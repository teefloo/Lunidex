import os, sys, subprocess, json, time
from pathlib import Path
root=Path(__file__).parent
env={k:v for k,v in os.environ.items() if not any(x in k for x in ['NEON','DATABASE','SUPABASE','SENTRY','POSTHOG','VAPID','RESEND','CRON','VERCEL','AGENTATION'])}
env.update({'NEXT_TELEMETRY_DISABLED':'1','NEXT_PUBLIC_ENABLE_AGENTATION':'false','NEXT_PUBLIC_APP_URL':'http://localhost:3100'})
commands={'dev':['npm','run','dev','--','--port','3100'],'vitest':['npm','test'],'lint':['npm','run','lint'],'seo':['npm','run','seo:check'],'core':['npx','--no-install','tsc','--project','packages/core/tsconfig.json','--noEmit'],'types':['npm','run','typecheck'],'build':['npm','run','build'],'start':['npm','run','start','--','--port','3101']}
for name in sys.argv[1:]:
 start=time.time()
 with open(root/(name+'.log'),'w') as log:
  p=subprocess.Popen(commands[name],cwd=root,env=env,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
  for line in p.stdout:
   log.write(line);log.flush()
  code=p.wait()
 result={'command':commands[name],'exit':code,'seconds':round(time.time()-start,2)}
 (root/(name+'-result.json')).write_text(json.dumps(result))
 print(json.dumps(result),flush=True)
