# Sito Web per Chiesa Cristiana Evangelica

Questo progetto è un sito web completo con pannello di amministrazione, basato su Firebase (Auth, Firestore, Storage) e EmailJS per l'invio di email.

## Requisiti
- Un account Google per Firebase
- Un account EmailJS (gratuito)
- Conoscenze base di hosting statico (GitHub Pages)

## Configurazione

### 1. Firebase
1. Vai su [Firebase Console](https://console.firebase.google.com/) e crea un nuovo progetto.
2. Registra un'app web e copia le credenziali in `js/firebase-config.js`.
3. Attiva **Authentication** → "Email/Password".
4. Crea un database **Firestore** in modalità di test (poi aggiorna le regole).
5. Attiva **Storage**.
6. Nella sezione Authentication, aggiungi un utente con:
   - Email: `owner@church.com`
   - Password: `Cicciobello`
7. In Firestore, crea una collezione `users` e aggiungi un documento con:
   - ID = UID dell'utente appena creato
   - Campi: `email: "owner@church.com"`, `role: "owner"`, `displayName: "Owner"`
8. Aggiorna le regole di sicurezza di Firestore (vedi sotto).

### 2. EmailJS
1. Iscriviti su [EmailJS](https://www.emailjs.com/).
2. Crea un servizio email (es. Gmail) e prendi il **Service ID**.
3. Crea un template con le variabili `{{from_email}}`, `{{message}}` e `{{to_emails}}`.
4. Prendi il **Template ID**.
5. Nelle impostazioni dell'account, copia la **Public Key**.
6. Inserisci questi valori in `js/emailjs-config.js`.

### 3. Hosting su GitHub Pages
1. Crea un repository su GitHub.
2. Carica tutti i file (rispettando la struttura cartelle: `index.html`, `css/`, `js/`, `README.md`).
3. Vai su Settings → Pages e seleziona il branch principale come sorgente.
4. Il sito sarà pubblicato a `https://tuonome.github.io/repo/`.

## Utilizzo

- **Home**: mostra ultimi 3 eventi e prodotti.
- **Eventi**: elenco completo degli eventi.
- **Libreria**: elenco prodotti con barra di ricerca, filtro per categoria e ordinamento.
- **Contatti**: modulo per inviare messaggi alle email configurate nelle impostazioni.
- **Area Admin** (solo owner):
  - Gestione eventi (CRUD)
  - Gestione prodotti (CRUD)
  - Impostazioni (email di ricezione)
  - Importazione prodotti da CSV

## Regole di sicurezza Firestore (da applicare nella console)
rules_version = '2';
service cloud.firestore {
match /databases/{database}/documents {
// Regole di lettura: tutti possono leggere eventi e prodotti
match /events/{document} {
allow read: if true;
allow write: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'owner';
}
match /products/{document} {
allow read: if true;
allow write: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'owner';
}
match /settings/{document} {
allow read: if true;
allow write: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'owner';
}
match /users/{userId} {
allow read: if request.auth != null && request.auth.uid == userId;
allow write: if false; // solo da backend
}
}
}

text

## Personalizzazioni
- Sostituisci i testi e le immagini placeholder con i tuoi contenuti.
- Aggiungi altre categorie di prodotti se necessario.
- Implementa la registrazione utenti se desideri (non richiesta per l'owner).

## Note
- L'import CSV accetta file con intestazioni: `nome,descrizione,prezzo,categoria,imageUrl`.
- Le immagini vengono caricate su Firebase Storage.
- Per provare l'area admin, effettua il login con `owner@church.com` / `Cicciobello`.