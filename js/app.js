// Variabili globali
let currentUser = null;
let userRole = null;
let quill; // editor

// Per memorizzare i provider dell'utente
let userProviders = [];

document.addEventListener('DOMContentLoaded', () => {
    // Inizializza Quill (se l'elemento esiste)
    if (document.getElementById('quillEditor')) {
        quill = new Quill('#quillEditor', {
            theme: 'snow',
            placeholder: 'Scrivi qui la descrizione...',
            modules: {
                toolbar: [
                    [{ 'header': [1, 2, 3, false] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    ['link', 'clean']
                ]
            }
        });
    }

    // Gestione hash
    window.addEventListener('hashchange', showPage);
    showPage();

    // Navbar scroll effect
    window.addEventListener('scroll', () => {
        const navbar = document.getElementById('mainNavbar');
        if (window.scrollY > 50) navbar.classList.add('scrolled');
        else navbar.classList.remove('scrolled');
    });

    // Auth state observer
    auth.onAuthStateChanged(async (user) => {
        currentUser = user;
        if (user) {
            document.getElementById('loginLink').style.display = 'none';
            document.getElementById('userMenu').style.display = 'block';
            document.getElementById('userName').textContent = user.displayName || user.email;

            // Ottieni i provider dell'utente
            userProviders = user.providerData.map(p => p.providerId);

            // Ottieni il ruolo da Firestore
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (userDoc.exists) {
                userRole = userDoc.data().role;
                // Se l'utente non ha displayName in auth ma ce l'ha in Firestore, aggiorna auth?
                if (!user.displayName && userDoc.data().displayName) {
                    await user.updateProfile({ displayName: userDoc.data().displayName });
                }
            } else {
                // Utente senza documento (dovrebbe capitare solo con Google se non completato)
                userRole = 'user';
                await db.collection('users').doc(user.uid).set({
                    email: user.email,
                    displayName: user.displayName || '',
                    role: 'user',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }

            if (userRole === 'owner') {
                document.getElementById('adminPanelLink').style.display = 'block';
                document.getElementById('editHomeBtnContainer').style.display = 'block';
            } else {
                document.getElementById('adminPanelLink').style.display = 'none';
                document.getElementById('editHomeBtnContainer').style.display = 'none';
            }

            // Carica i dati del profilo se siamo sulla pagina profilo
            if (window.location.hash === '#profile') {
                loadProfileData();
            }
        } else {
            document.getElementById('loginLink').style.display = 'block';
            document.getElementById('userMenu').style.display = 'none';
            document.getElementById('editHomeBtnContainer').style.display = 'none';
            userRole = null;
            userProviders = [];
        }
    });

    // Login form
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        try {
            await auth.signInWithEmailAndPassword(email, password);
            // Chiudi modale
            const modal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
            modal.hide();
            showToast('Login effettuato');
        } catch (error) {
            showToast(error.message, 'danger');
        }
    });

    // Registrazione
    document.getElementById('registerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('registerName').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        try {
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            await user.updateProfile({ displayName: name });
            await db.collection('users').doc(user.uid).set({
                email: email,
                displayName: name,
                role: 'user',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            const modal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
            modal.hide();
            showToast('Registrazione completata');
        } catch (error) {
            showToast(error.message, 'danger');
        }
    });

    // Login con Google
    document.getElementById('googleLoginBtn').addEventListener('click', async () => {
        const provider = new firebase.auth.GoogleAuthProvider();
        try {
            const result = await auth.signInWithPopup(provider);
            const user = result.user;
            // Controlla se esiste già in Firestore
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (!userDoc.exists) {
                // Primo accesso: mostra modale per nome
                const nameModal = new bootstrap.Modal(document.getElementById('nameModal'));
                nameModal.show();
            } else {
                // Chiudi modale login
                const loginModal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
                if (loginModal) loginModal.hide();
                showToast('Login con Google effettuato');
            }
        } catch (error) {
            showToast(error.message, 'danger');
        }
    });

    // Salva nome dopo Google
    document.getElementById('nameForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const displayName = document.getElementById('displayNameInput').value;
        const user = auth.currentUser;
        if (user) {
            try {
                await user.updateProfile({ displayName: displayName });
                await db.collection('users').doc(user.uid).set({
                    email: user.email,
                    displayName: displayName,
                    role: 'user',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                const nameModal = bootstrap.Modal.getInstance(document.getElementById('nameModal'));
                nameModal.hide();
                const loginModal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
                if (loginModal) loginModal.hide();
                showToast('Benvenuto!');
            } catch (error) {
                showToast(error.message, 'danger');
            }
        }
    });

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        await auth.signOut();
        window.location.hash = '#home';
    });

    // Link al profilo
    document.getElementById('profileLink').addEventListener('click', (e) => {
        e.preventDefault();
        window.location.hash = '#profile';
    });

    // Admin panel link
    document.getElementById('adminPanelLink').addEventListener('click', (e) => {
        e.preventDefault();
        window.location.hash = '#admin';
    });

    // Profilo: carica dati
    function loadProfileData() {
        if (currentUser) {
            document.getElementById('profileName').value = currentUser.displayName || '';
            document.getElementById('profileEmail').value = currentUser.email || '';
            document.getElementById('profilePassword').value = '';

            // Gestione modifiche in base al provider
            const emailField = document.getElementById('profileEmail');
            const emailNote = document.getElementById('emailChangeNote');
            const passwordNote = document.getElementById('passwordChangeNote');

            if (userProviders.includes('google.com')) {
                // Utente Google: non può cambiare email, né password
                emailField.disabled = true;
                emailNote.textContent = 'Email non modificabile (account Google)';
                document.getElementById('profilePassword').disabled = true;
                passwordNote.textContent = 'Password non modificabile (account Google)';
            } else {
                emailField.disabled = false;
                emailNote.textContent = '';
                document.getElementById('profilePassword').disabled = false;
                passwordNote.textContent = '';
            }
        }
    }

    // Aggiorna profilo
    document.getElementById('profileForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const newName = document.getElementById('profileName').value;
        const newEmail = document.getElementById('profileEmail').value;
        const newPassword = document.getElementById('profilePassword').value;

        try {
            if (newName !== currentUser.displayName) {
                await currentUser.updateProfile({ displayName: newName });
                await db.collection('users').doc(currentUser.uid).update({ displayName: newName });
            }
            // Cambio email solo se non è Google
            if (!userProviders.includes('google.com') && newEmail !== currentUser.email) {
                await currentUser.updateEmail(newEmail);
                await db.collection('users').doc(currentUser.uid).update({ email: newEmail });
            }
            if (!userProviders.includes('google.com') && newPassword) {
                await currentUser.updatePassword(newPassword);
            }
            showToast('Profilo aggiornato');
        } catch (error) {
            showToast(error.message, 'danger');
        }
    });

    // Contact form (email fissa)
    document.getElementById('contactForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('contactEmail').value;
        const message = document.getElementById('contactMessage').value;
        try {
            await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
                from_email: email,
                message: message,
                to_email: 'info@ilfaroavigliana.it' // Fissa
            });
            showToast('Messaggio inviato con successo!');
            document.getElementById('contactForm').reset();
        } catch (error) {
            showToast('Errore invio: ' + error.text, 'danger');
        }
    });

    // Carica dati iniziali per home
    loadHomeData();
    loadLatestEvents();
    loadLatestProducts();
    loadCategoriesFilter(); // per il filtro prodotti
});

function showPage() {
    const hash = window.location.hash.substring(1) || 'home';
    document.querySelectorAll('.page').forEach(page => page.style.display = 'none');
    const activePage = document.getElementById(hash);
    if (activePage) {
        activePage.style.display = 'block';
        if (hash === 'events') loadEvents();
        if (hash === 'products') {
            loadProducts();
            loadCategoriesFilter(); // ricarica le categorie nel filtro
        }
        if (hash === 'activities') loadActivities();
        if (hash === 'profile') {
            if (!currentUser) {
                showToast('Devi essere loggato', 'warning');
                window.location.hash = '#home';
            }
        }
        if (hash === 'admin') {
            if (userRole === 'owner') {
                admin.loadEvents();
                admin.loadProducts();
                admin.loadCategories();
                admin.loadActivities();
                admin.loadHomepageData();
                admin.loadAllUsers();
            } else {
                showToast('Accesso negato', 'danger');
                window.location.hash = '#home';
            }
        }
    } else {
        document.getElementById('home').style.display = 'block';
    }
}

// ------------------- CARICAMENTO DATI PUBBLICI -------------------

async function loadHomeData() {
    const doc = await db.collection('settings').doc('homepage').get();
    if (doc.exists) {
        const data = doc.data();
        document.getElementById('homeTitle').innerText = data.title || 'Benvenuti ne "Il Faro"';
        document.getElementById('homeSubtitle').innerText = data.subtitle || 'Chiesa Cristiana Evangelica di Avigliana (TO)';
        document.getElementById('homeEventsTitle').innerHTML = (data.eventsTitle || '<i class="fas fa-calendar-alt me-2"></i>Prossimi Eventi');
        document.getElementById('homeProductsTitle').innerHTML = (data.productsTitle || '<i class="fas fa-book-open me-2"></i>Nuovi Arrivi in Libreria');
    }
}

async function loadLatestEvents() {
    const snapshot = await db.collection('events').orderBy('date', 'desc').limit(3).get();
    const container = document.getElementById('latest-events');
    container.innerHTML = '';
    snapshot.forEach(doc => container.appendChild(createEventCard(doc.id, doc.data())));
}

async function loadLatestProducts() {
    const snapshot = await db.collection('products').orderBy('createdAt', 'desc').limit(3).get();
    const container = document.getElementById('latest-products');
    container.innerHTML = '';
    snapshot.forEach(doc => container.appendChild(createProductCard(doc.id, doc.data())));
}

async function loadEvents() {
    const snapshot = await db.collection('events').orderBy('date', 'desc').get();
    const container = document.getElementById('events-list');
    container.innerHTML = '';
    snapshot.forEach(doc => container.appendChild(createEventCard(doc.id, doc.data())));
}

async function loadProducts() {
    let products = [];
    const snapshot = await db.collection('products').get();
    snapshot.forEach(doc => products.push({ id: doc.id, ...doc.data() }));

    const searchTerm = document.getElementById('searchProducts').value.toLowerCase();
    const category = document.getElementById('filterCategory').value;
    const sort = document.getElementById('sortProducts').value;

    if (category) products = products.filter(p => p.category === category);
    if (searchTerm) {
        products = products.filter(p => 
            p.name.toLowerCase().includes(searchTerm) || 
            p.description.toLowerCase().includes(searchTerm)
        );
    }

    if (sort === 'nameAsc') products.sort((a,b) => a.name.localeCompare(b.name));
    else if (sort === 'nameDesc') products.sort((a,b) => b.name.localeCompare(a.name));
    else if (sort === 'priceAsc') products.sort((a,b) => a.price - b.price);
    else if (sort === 'priceDesc') products.sort((a,b) => b.price - a.price);

    const container = document.getElementById('products-list');
    container.innerHTML = '';
    products.forEach(prod => container.appendChild(createProductCard(prod.id, prod)));
}

async function loadActivities() {
    const snapshot = await db.collection('activities').orderBy('createdAt', 'desc').get();
    const container = document.getElementById('activities-list');
    container.innerHTML = '';
    snapshot.forEach(doc => container.appendChild(createActivityCard(doc.id, doc.data())));
}

async function loadCategoriesFilter() {
    const snapshot = await db.collection('categories').orderBy('name').get();
    const select = document.getElementById('filterCategory');
    select.innerHTML = '<option value="">Tutte le categorie</option>';
    snapshot.forEach(doc => {
        const cat = doc.data();
        const option = document.createElement('option');
        option.value = cat.name;
        option.textContent = cat.name;
        select.appendChild(option);
    });
}

// ------------------- FUNZIONI PER CREARE CARD -------------------

function createEventCard(id, ev) {
    const col = document.createElement('div');
    col.className = 'col-md-4';
    col.setAttribute('data-aos', 'fade-up');
    col.innerHTML = `
        <div class="card h-100">
            <div class="card-body">
                <h5 class="card-title">${ev.title}</h5>
                <div class="card-text">${ev.description}</div>
                <div class="d-flex align-items-center text-muted mb-2 mt-3">
                    <i class="far fa-calendar-alt me-2"></i> ${formatDate(ev.date)}
                </div>
                <div class="d-flex align-items-center text-muted">
                    <i class="fas fa-map-marker-alt me-2"></i> ${ev.location}
                </div>
            </div>
        </div>
    `;
    return col;
}

function createProductCard(id, prod) {
    const col = document.createElement('div');
    col.className = 'col-md-4';
    col.setAttribute('data-aos', 'fade-up');
    col.innerHTML = `
        <div class="card h-100">
            <div class="card-body">
                <h5 class="card-title">${prod.name}</h5>
                <div class="card-text">${prod.description}</div>
                <p class="fw-bold text-primary h5 mt-3">€ ${prod.price.toFixed(2)}</p>
                <span class="badge-category">${prod.category}</span>
            </div>
        </div>
    `;
    return col;
}

function createActivityCard(id, act) {
    const col = document.createElement('div');
    col.className = 'col-md-4';
    col.setAttribute('data-aos', 'fade-up');
    col.innerHTML = `
        <div class="card h-100">
            <div class="card-body">
                <h5 class="card-title">${act.title}</h5>
                <div class="card-text">${act.description}</div>
                ${act.date ? `<div class="d-flex align-items-center text-muted mt-3"><i class="far fa-calendar-alt me-2"></i> ${formatDate(act.date)}</div>` : ''}
                ${act.location ? `<div class="d-flex align-items-center text-muted"><i class="fas fa-map-marker-alt me-2"></i> ${act.location}</div>` : ''}
            </div>
        </div>
    `;
    return col;
}

// Listener per filtri prodotti
document.getElementById('searchProducts').addEventListener('input', loadProducts);
document.getElementById('filterCategory').addEventListener('change', loadProducts);
document.getElementById('sortProducts').addEventListener('change', loadProducts);

// Funzione per aprire il modal di modifica homepage (chiamata dal pulsante fluttuante)
function openHomeEditModal() {
    // Carica i dati correnti
    const title = document.getElementById('homeTitle').innerText;
    const subtitle = document.getElementById('homeSubtitle').innerText;
    // Estrae il testo puro dai titoli delle sezioni (ignora le icone)
    const eventsTitle = document.getElementById('homeEventsTitle').innerText.replace(/Prossimi Eventi/i, 'Prossimi Eventi').trim();
    const productsTitle = document.getElementById('homeProductsTitle').innerText.replace(/Nuovi Arrivi in Libreria/i, 'Nuovi Arrivi in Libreria').trim();

    document.getElementById('homeEditTitle').value = title;
    document.getElementById('homeEditSubtitle').value = subtitle;
    document.getElementById('homeEditEventsTitle').value = eventsTitle;
    document.getElementById('homeEditProductsTitle').value = productsTitle;

    const modal = new bootstrap.Modal(document.getElementById('homeEditModal'));
    modal.show();
}

// Gestione salvataggio homepage dal modal
document.getElementById('homeEditForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
        title: document.getElementById('homeEditTitle').value,
        subtitle: document.getElementById('homeEditSubtitle').value,
        eventsTitle: document.getElementById('homeEditEventsTitle').value,
        productsTitle: document.getElementById('homeEditProductsTitle').value
    };
    await db.collection('settings').doc('homepage').set(data);
    // Aggiorna la home
    document.getElementById('homeTitle').innerText = data.title;
    document.getElementById('homeSubtitle').innerText = data.subtitle;
    document.getElementById('homeEventsTitle').innerHTML = `<i class="fas fa-calendar-alt me-2"></i>${data.eventsTitle}`;
    document.getElementById('homeProductsTitle').innerHTML = `<i class="fas fa-book-open me-2"></i>${data.productsTitle}`;
    
    const modal = bootstrap.Modal.getInstance(document.getElementById('homeEditModal'));
    modal.hide();
    showToast('Homepage aggiornata');
});