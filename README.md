# espifam-site

Static site for espifam.com.


## Local Development

```bash
docker run -p 8085:80 -v $(pwd)/src:/usr/share/nginx/html:ro nginx
```

Open `http://localhost:8085`.



## Deploy

```bash
export ESPIFAM_DEPLOY_TARGET="user@nginx-host:/var/www/html/espifam.com/"
npm run deploy
```
