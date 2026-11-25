FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Entraîne et sauvegarde les modèles ML pendant le build de l'image (pas au démarrage)
RUN python -c "from app.affluence_model import affluence_model; from app.anomaly_model import anomaly_model; affluence_model.predict_affluence(1); anomaly_model.analyze(25000, 1, 12, 4)"

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
