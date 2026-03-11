const admin = {
    currentItemType: null, // 'event', 'product', 'activity', 'category'

    // ---------- EVENTI ----------
    async loadEvents() {
        const snapshot = await db.collection('events').orderBy('date', 'desc').get();
        const tbody = document.getElementById('adminEventsTable');
        tbody.innerHTML = '';
        snapshot.forEach(doc => {
            const ev = doc.data();
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${ev.title}</td>
                <td>${formatDate(ev.date)}</td>
                <td>
                    <button class="btn btn-sm btn-warning rounded-pill me-2" onclick="admin.editEvent('${doc.id}')"><i class="fas fa-edit"></i> Modifica</button>
                    <button class="btn btn-sm btn-danger rounded-pill" onclick="admin.deleteEvent('${doc.id}')"><i class="fas fa-trash"></i> Elimina</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    },

    showEventModal(id = null) {
        this.currentItemType = 'event';
        document.getElementById('modalTitle').textContent = id ? 'Modifica Evento' : 'Nuovo Evento';
        document.getElementById('eventFields').style.display = 'block';
        document.getElementById('productFields').style.display = 'none';
        document.getElementById('activityFields').style.display = 'none';
        document.getElementById('categoryFields').style.display = 'none';
        document.getElementById('quillContainer').style.display = 'block';
        document.getElementById('itemForm').reset();
        document.getElementById('itemId').value = '';
        if (quill) quill.root.innerHTML = '';
        if (id) this.loadEventData(id);
        new bootstrap.Modal(document.getElementById('itemModal')).show();
    },

    async loadEventData(id) {
        const doc = await db.collection('events').doc(id).get();
        if (doc.exists) {
            const data = doc.data();
            document.getElementById('itemId').value = id;
            document.getElementById('itemName').value = data.title;
            if (quill) quill.root.innerHTML = data.description;
            document.getElementById('eventDate').value = data.date.toDate().toISOString().slice(0,16);
            document.getElementById('eventLocation').value = data.location;
        }
    },

    async deleteEvent(id) {
        if (confirm('Eliminare questo evento?')) {
            await db.collection('events').doc(id).delete();
            this.loadEvents();
            showToast('Evento eliminato');
        }
    },

    // ---------- PRODOTTI ----------
    async loadProducts() {
        const snapshot = await db.collection('products').orderBy('createdAt', 'desc').get();
        const tbody = document.getElementById('adminProductsTable');
        tbody.innerHTML = '';
        snapshot.forEach(doc => {
            const prod = doc.data();
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${prod.name}</td>
                <td>€ ${prod.price.toFixed(2)}</td>
                <td>${prod.category}</td>
                <td>
                    <button class="btn btn-sm btn-warning rounded-pill me-2" onclick="admin.editProduct('${doc.id}')"><i class="fas fa-edit"></i> Modifica</button>
                    <button class="btn btn-sm btn-danger rounded-pill" onclick="admin.deleteProduct('${doc.id}')"><i class="fas fa-trash"></i> Elimina</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    },

    showProductModal(id = null) {
        this.currentItemType = 'product';
        document.getElementById('modalTitle').textContent = id ? 'Modifica Prodotto' : 'Nuovo Prodotto';
        document.getElementById('eventFields').style.display = 'none';
        document.getElementById('productFields').style.display = 'block';
        document.getElementById('activityFields').style.display = 'none';
        document.getElementById('categoryFields').style.display = 'none';
        document.getElementById('quillContainer').style.display = 'block';
        document.getElementById('itemForm').reset();
        document.getElementById('itemId').value = '';
        if (quill) quill.root.innerHTML = '';
        // Popola select categorie
        this.populateCategorySelect();
        if (id) this.loadProductData(id);
        new bootstrap.Modal(document.getElementById('itemModal')).show();
    },

    async populateCategorySelect() {
        const snapshot = await db.collection('categories').orderBy('name').get();
        const select = document.getElementById('productCategory');
        select.innerHTML = '';
        snapshot.forEach(doc => {
            const cat = doc.data();
            const option = document.createElement('option');
            option.value = cat.name;
            option.textContent = cat.name;
            select.appendChild(option);
        });
    },

    async loadProductData(id) {
        const doc = await db.collection('products').doc(id).get();
        if (doc.exists) {
            const data = doc.data();
            document.getElementById('itemId').value = id;
            document.getElementById('itemName').value = data.name;
            if (quill) quill.root.innerHTML = data.description;
            document.getElementById('productPrice').value = data.price;
            document.getElementById('productCategory').value = data.category;
        }
    },

    async deleteProduct(id) {
        if (confirm('Eliminare questo prodotto?')) {
            await db.collection('products').doc(id).delete();
            this.loadProducts();
            showToast('Prodotto eliminato');
        }
    },

    // ---------- CATEGORIE ----------
    async loadCategories() {
        const snapshot = await db.collection('categories').orderBy('name').get();
        const tbody = document.getElementById('adminCategoriesTable');
        tbody.innerHTML = '';
        snapshot.forEach(doc => {
            const cat = doc.data();
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${cat.name}</td>
                <td>
                    <button class="btn btn-sm btn-warning rounded-pill me-2" onclick="admin.editCategory('${doc.id}')"><i class="fas fa-edit"></i> Modifica</button>
                    <button class="btn btn-sm btn-danger rounded-pill" onclick="admin.deleteCategory('${doc.id}')"><i class="fas fa-trash"></i> Elimina</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    },

    showCategoryModal(id = null) {
        this.currentItemType = 'category';
        document.getElementById('modalTitle').textContent = id ? 'Modifica Categoria' : 'Nuova Categoria';
        document.getElementById('eventFields').style.display = 'none';
        document.getElementById('productFields').style.display = 'none';
        document.getElementById('activityFields').style.display = 'none';
        document.getElementById('categoryFields').style.display = 'block';
        document.getElementById('quillContainer').style.display = 'none'; // niente descrizione
        document.getElementById('itemForm').reset();
        document.getElementById('itemId').value = '';
        if (id) this.loadCategoryData(id);
        new bootstrap.Modal(document.getElementById('itemModal')).show();
    },

    async loadCategoryData(id) {
        const doc = await db.collection('categories').doc(id).get();
        if (doc.exists) {
            document.getElementById('itemId').value = id;
            document.getElementById('itemName').value = doc.data().name;
        }
    },

    async deleteCategory(id) {
        if (confirm('Eliminare questa categoria? I prodotti con questa categoria rimarranno senza categoria valida.')) {
            await db.collection('categories').doc(id).delete();
            this.loadCategories();
            showToast('Categoria eliminata');
        }
    },

    // ---------- ATTIVITÀ ----------
    async loadActivities() {
        const snapshot = await db.collection('activities').orderBy('createdAt', 'desc').get();
        const tbody = document.getElementById('adminActivitiesTable');
        tbody.innerHTML = '';
        snapshot.forEach(doc => {
            const act = doc.data();
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${act.title}</td>
                <td>${act.date ? formatDate(act.date) : '-'}</td>
                <td>
                    <button class="btn btn-sm btn-warning rounded-pill me-2" onclick="admin.editActivity('${doc.id}')"><i class="fas fa-edit"></i> Modifica</button>
                    <button class="btn btn-sm btn-danger rounded-pill" onclick="admin.deleteActivity('${doc.id}')"><i class="fas fa-trash"></i> Elimina</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    },

    showActivityModal(id = null) {
        this.currentItemType = 'activity';
        document.getElementById('modalTitle').textContent = id ? 'Modifica Attività' : 'Nuova Attività';
        document.getElementById('eventFields').style.display = 'none';
        document.getElementById('productFields').style.display = 'none';
        document.getElementById('activityFields').style.display = 'block';
        document.getElementById('categoryFields').style.display = 'none';
        document.getElementById('quillContainer').style.display = 'block';
        document.getElementById('itemForm').reset();
        document.getElementById('itemId').value = '';
        if (quill) quill.root.innerHTML = '';
        if (id) this.loadActivityData(id);
        new bootstrap.Modal(document.getElementById('itemModal')).show();
    },

    async loadActivityData(id) {
        const doc = await db.collection('activities').doc(id).get();
        if (doc.exists) {
            const data = doc.data();
            document.getElementById('itemId').value = id;
            document.getElementById('itemName').value = data.title;
            if (quill) quill.root.innerHTML = data.description;
            if (data.date) {
                document.getElementById('activityDate').value = data.date.toDate().toISOString().slice(0,16);
            }
            if (data.location) {
                document.getElementById('activityLocation').value = data.location;
            }
        }
    },

    async deleteActivity(id) {
        if (confirm('Eliminare questa attività?')) {
            await db.collection('activities').doc(id).delete();
            this.loadActivities();
            showToast('Attività eliminata');
        }
    },

    // ---------- HOMEPAGE ----------
    async loadHomepageData() {
        const doc = await db.collection('settings').doc('homepage').get();
        if (doc.exists) {
            const data = doc.data();
            document.getElementById('homeTitleInput').value = data.title || '';
            document.getElementById('homeSubtitleInput').value = data.subtitle || '';
            document.getElementById('homeEventsTitleInput').value = data.eventsTitle || '';
            document.getElementById('homeProductsTitleInput').value = data.productsTitle || '';
        }
    },

    // ---------- UTENTI ----------
    async loadAllUsers() {
        const snapshot = await db.collection('users').get();
        const tbody = document.getElementById('usersList');
        tbody.innerHTML = '';
        snapshot.forEach(doc => {
            const user = doc.data();
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${user.email}</td>
                <td>${user.displayName || ''}</td>
                <td>${user.role || 'user'}</td>
                <td>
                    ${user.role !== 'owner' ? 
                        `<button class="btn btn-sm btn-success rounded-pill" onclick="admin.makeOwner('${doc.id}')">Rendi owner</button>` : 
                        `<button class="btn btn-sm btn-warning rounded-pill" onclick="admin.revokeOwner('${doc.id}')">Revoca owner</button>`}
                </td>
            `;
            tbody.appendChild(tr);
        });
    },

    async makeOwner(uid) {
        await db.collection('users').doc(uid).update({ role: 'owner' });
        showToast('Utente ora è owner');
        this.loadAllUsers();
    },

    async revokeOwner(uid) {
        await db.collection('users').doc(uid).update({ role: 'user' });
        showToast('Ruolo owner revocato');
        this.loadAllUsers();
    },

    // ---------- IMPORT CSV ----------
    async importCSV() {
        const file = document.getElementById('csvFile').files[0];
        if (!file) return;
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                for (const row of results.data) {
                    await db.collection('products').add({
                        name: row.nome,
                        description: row.descrizione,
                        price: parseFloat(row.prezzo),
                        category: row.categoria,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
                showToast('Importazione completata');
                this.loadProducts();
            }
        });
    }
};

// Gestione salvataggio dal modal
document.getElementById('itemForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('itemId').value;
    const name = document.getElementById('itemName').value;
    const description = document.getElementById('itemDesc').value;

    if (admin.currentItemType === 'event') {
        const date = new Date(document.getElementById('eventDate').value);
        const location = document.getElementById('eventLocation').value;
        const data = {
            title: name,
            description: description,
            date: firebase.firestore.Timestamp.fromDate(date),
            location: location,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        if (id) {
            await db.collection('events').doc(id).update(data);
        } else {
            await db.collection('events').add(data);
        }
    } else if (admin.currentItemType === 'product') {
        const price = parseFloat(document.getElementById('productPrice').value);
        const category = document.getElementById('productCategory').value;
        const data = {
            name: name,
            description: description,
            price: price,
            category: category,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        if (id) {
            await db.collection('products').doc(id).update(data);
        } else {
            await db.collection('products').add(data);
        }
    } else if (admin.currentItemType === 'activity') {
        const dateInput = document.getElementById('activityDate').value;
        const location = document.getElementById('activityLocation').value;
        const data = {
            title: name,
            description: description,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        if (dateInput) data.date = firebase.firestore.Timestamp.fromDate(new Date(dateInput));
        if (location) data.location = location;
        if (id) {
            await db.collection('activities').doc(id).update(data);
        } else {
            await db.collection('activities').add(data);
        }
    } else if (admin.currentItemType === 'category') {
        const data = { name: name };
        if (id) {
            await db.collection('categories').doc(id).update(data);
        } else {
            await db.collection('categories').add(data);
        }
    }

    // Chiudi la modale
    const modal = bootstrap.Modal.getInstance(document.getElementById('itemModal'));
    modal.hide();

    // Ricarica la lista appropriata
    if (admin.currentItemType === 'event') admin.loadEvents();
    else if (admin.currentItemType === 'product') admin.loadProducts();
    else if (admin.currentItemType === 'activity') admin.loadActivities();
    else if (admin.currentItemType === 'category') admin.loadCategories();

    showToast('Salvato con successo');
});

// Salvataggio homepage (dalla scheda admin)
document.getElementById('homepageForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
        title: document.getElementById('homeTitleInput').value,
        subtitle: document.getElementById('homeSubtitleInput').value,
        eventsTitle: document.getElementById('homeEventsTitleInput').value,
        productsTitle: document.getElementById('homeProductsTitleInput').value
    };
    await db.collection('settings').doc('homepage').set(data);
    showToast('Homepage aggiornata');
    // Se siamo su home, aggiorna anche la visualizzazione
    if (window.location.hash === '#home') {
        document.getElementById('homeTitle').innerText = data.title;
        document.getElementById('homeSubtitle').innerText = data.subtitle;
        document.getElementById('homeEventsTitle').innerHTML = `<i class="fas fa-calendar-alt me-2"></i>${data.eventsTitle}`;
        document.getElementById('homeProductsTitle').innerHTML = `<i class="fas fa-book-open me-2"></i>${data.productsTitle}`;
    }
});

// Esponi oggetto admin globalmente
window.admin = admin;