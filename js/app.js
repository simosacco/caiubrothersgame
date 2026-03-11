// Variabili globali
let currentUser = null;
let userRole = null;
let quill; // editor

document.addEventListener('DOMContentLoaded', () => {
    // Inizializza Quill (attenzione: potrebbe essere chiamato più volte, lo gestiamo)
    if (!quill) {
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

    // Sincronizza Quill con il textarea nascosto prima di inviare il form
    document.getElementById('itemForm').addEventListener('submit', function(e) {
        // Non previeni qui perché vogliamo che il form venga inviato normalmente
        // ma assicuriamoci che il textarea venga aggiornato
        document.getElementById('itemDesc').value = quill.root.innerHTML;
    });

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
                // In teoria gestiamo nella registrazione Google, ma per sicurezza:
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
            } else {
                document.getElementById('adminPanelLink').style.display = 'none';
            }

            // Carica i dati del profilo se siamo sulla pagina profilo
            if (window.location.hash === '#profile') {
                loadProfileData();
            }
        } else {
            document.getElementById('loginLink').style.display = 'block';
            document.getElementById('userMenu').style.display = 'none';
            userRole = null;
        }
    });

    // Login form
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        try {
            await auth.signInWithEmailAndPassword(email, password);
            bootstrap.Modal.getInstance(document.getElementById('loginModal')).hide();
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
            bootstrap.Modal.getInstance(document.getElementById('loginModal')).hide();
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
                // Primo accesso: chiedi il nome
                $('#nameModal').modal('show');
            } else {
                bootstrap.Modal.getInstance(document.getElementById('loginModal')).hide();
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
                $('#nameModal').modal('hide');
                bootstrap.Modal.getInstance(document.getElementById('loginModal')).hide();
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
            if (newEmail !== currentUser.email) {
                await currentUser.updateEmail(newEmail);
                await db.collection('users').doc(currentUser.uid).update({ email: newEmail });
            }
            if (newPassword) {
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
    // Mantieni l'opzione "Tutte le categorie"
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