 # Secure Object Proxy

 Deployment includes the Secure Object Proxy and an S3 compliant backend (localstack).

 The docker compose provisions a bucket `cop-demo`

 To validate and the bucket is created and/or browse the bucket:

 http://localhost:4566/cop-demo


Add s4/localstack hosts to /etc/hosts:

 ```
 echo "127.0.0.1  local-s4.virtru.com" | sudo tee -a /etc/hosts
 echo "127.0.0.1  *.local-s4.virtru.com" | sudo tee -a /etc/hosts
 echo "127.0.0.1  localstack.virtru.com" | sudo tee -a /etc/hosts
```