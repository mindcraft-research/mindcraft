@echo off
echo.
echo  ========================================
echo   ExperLab — Installation et demarrage
echo  ========================================
echo.

REM ── Backend ──────────────────────────────────────────────────────────────────
echo [1/4] Installation des dependances backend...
cd backend
call npm install
if %errorlevel% neq 0 ( echo ERREUR: npm install backend a echoue & pause & exit /b 1 )

echo [2/4] Generation du client Prisma...
call npx prisma generate
if %errorlevel% neq 0 ( echo ERREUR: prisma generate a echoue & pause & exit /b 1 )

echo [3/4] Creation de la base de donnees...
call npx prisma db push
if %errorlevel% neq 0 (
  echo.
  echo ATTENTION: La creation de la base de donnees a echoue.
  echo Verifiez que PostgreSQL est bien demarre et que le mot de passe
  echo dans backend\.env correspond a celui defini a l'installation.
  echo.
  pause
  exit /b 1
)

REM ── Frontend ─────────────────────────────────────────────────────────────────
echo [4/4] Installation des dependances frontend...
cd ../frontend
call npm install
if %errorlevel% neq 0 ( echo ERREUR: npm install frontend a echoue & pause & exit /b 1 )

echo.
echo  ========================================
echo   Installation terminee avec succes !
echo  ========================================
echo.
echo  Pour demarrer la plateforme, ouvrez DEUX terminaux :
echo.
echo  Terminal 1 (backend) :
echo    cd backend
echo    npm run dev
echo.
echo  Terminal 2 (frontend) :
echo    cd frontend
echo    npm run dev
echo.
echo  Puis ouvrez : http://localhost:3000
echo.
pause
