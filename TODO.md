# TODO – Deploy Azure Functions (FastAPI)

1. **Testare che funzioni localmente il wrapper per Azure Functions rifattorizzato**
   - FastAPI esposta come Azure Function tramite il nuovo setup: `__init__.py`, `function.json`, ecc.

2. **Aggiornare la repo git**
   - Commit delle modifiche: nuova struttura, file spostati/creati, eventuali pulizie (es. rimozione di `function_app.py` se non più usato).

3. **Aggiornare il workflow GitHub Actions**
   - Configurare per usare Azure Functions Core Tools (`func azure functionapp publish ...`)
   - Puntare alla cartella corretta (`backend/azure`)

4. **Testare che il backend sia pubblicato e funzionante su Azure**
   - Verificare che gli endpoint siano raggiungibili e rispondano correttamente da remoto.
