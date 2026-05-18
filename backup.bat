@echo off
set FECHA=%date:~-4%-%date:~3,2%-%date:~0,2%

"C:\Users\bouch\OneDrive\Bureau\mongoDbTools\mongodb-database-tools-windows-x86_64-100.17.0\bin\mongodump" --uri=mongodb://krifaraouf60_db_user:I4mtTu1yZJeI31JP@ac-4uyxbxv-shard-00-00.nmj85vd.mongodb.net:27017,ac-4uyxbxv-shard-00-01.nmj85vd.mongodb.net:27017,ac-4uyxbxv-shard-00-02.nmj85vd.mongodb.net:27017/inventory?ssl=true&replicaSet=atlas-v7i0n0-shard-0&authSource=admin&appName=Cluster0" --out="backup\%FECHA%"

git pull origin main
git add backup\
git add .gitignore
git add backup.bat
git commit -m "DB backup %FECHA%"
git push origin main

echo Backup done!