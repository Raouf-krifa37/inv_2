@echo off
set FECHA=%date:~-4%-%date:~3,2%-%date:~0,2%

"C:\Users\bouch\OneDrive\Bureau\mongoDbTools\mongodb-database-tools-windows-x86_64-100.17.0\bin\mongodump" --uri="mongodb+srv://krifaraouf60_db_user:I4mtTu1yZJeI31JP@cluster0.nmj85vd.mongodb.net/?appName=Cluster0" --out="backup\%FECHA%"

git pull origin main
git add backup\
git add .gitignore
git add backup.bat
git commit -m "DB backup %FECHA%"
git push origin main

echo Backup done!





