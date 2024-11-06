import React, { useState, useEffect } from 'react';

const UserTable = ({ showModal, setShowModal }) => {
    // State definitions
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [formError, setFormError] = useState(null);
    const [globalSearch, setGlobalSearch] = useState('');

    const [data, setData] = useState(() => {
        const savedData = localStorage.getItem('dashboardData');
        return savedData ? JSON.parse(savedData) : [
            {
                id: 1,
                name: 'יוסי כהן',
                email: 'yossi@example.com',
                phone: '054-1234567',
                address: 'תל אביב',
                additionalInfo: 'מידע נוסף על יוסי'
            }
        ];
    });

    const [expandedRow, setExpandedRow] = useState(null);
    const [filterCriteria, setFilterCriteria] = useState({
        name: '',
        email: '',
        phone: '',
        address: ''
    });
    const [sortColumn, setSortColumn] = useState('name');
    const [sortDirection, setSortDirection] = useState('asc');
    const [filteredData, setFilteredData] = useState(data);
    const [viewType, setViewType] = useState('table');
    const [editingItem, setEditingItem] = useState(null);

    // Validation function
    const validateForm = () => {
        setFormError(null);
        if (!name.trim()) {
            setFormError("שם הוא שדה חובה");
            return false;
        }
        if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
            setFormError("כתובת אימייל לא תקינה");
            return false;
        }
        if (!phone.match(/^[0-9-]+$/)) {
            setFormError("מספר טלפון לא תקין");
            return false;
        }
        return true;
    };

    // Toast notification
    const showToast = (message, type = 'success') => {
        const toastDiv = document.createElement('div');
        toastDiv.className = `toast show position-fixed bottom-0 end-0 m-3 bg-${type}`;
        toastDiv.style.zIndex = '1000';
        toastDiv.innerHTML = `
            <div class="toast-body text-white">
                ${message}
            </div>
        `;
        document.body.appendChild(toastDiv);
        setTimeout(() => {
            toastDiv.remove();
        }, 3000);
    };

    // Export function
    const exportData = () => {
        const dataStr = JSON.stringify(data, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        const exportFileDefaultName = 'dashboard-data.json';
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        showToast('הנתונים יוצאו בהצלחה');
    };

    // Filter and sort effect
    useEffect(() => {
        let filtered = data;

        // Global search
        if (globalSearch) {
            filtered = filtered.filter(item =>
                Object.values(item).some(val =>
                    val.toString().toLowerCase().includes(globalSearch.toLowerCase())
                )
            );
        }

        // Specific filters
        filtered = filtered.filter(item =>
            Object.keys(filterCriteria).every(key =>
                item[key].toLowerCase().includes(filterCriteria[key].toLowerCase())
            )
        );

        // Sorting
        filtered.sort((a, b) => {
            if (a[sortColumn] < b[sortColumn]) return sortDirection === 'asc' ? -1 : 1;
            if (a[sortColumn] > b[sortColumn]) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        setFilteredData(filtered);
    }, [data, filterCriteria, sortColumn, sortDirection, globalSearch]);

    const toggleRow = (id) => {
        setExpandedRow(expandedRow === id ? null : id);
    };

    const handleAddOrUpdateData = () => {
        if (!validateForm()) return;

        if (editingItem) {
            const updatedData = data.map(item =>
                item.id === editingItem.id ? { ...item, name, email, phone, address } : item
            );
            setData(updatedData);
            setEditingItem(null);
            showToast('הנתונים עודכנו בהצלחה');
        } else {
            const newData = [...data, {
                id: Date.now(),
                name,
                email,
                phone,
                address,
                additionalInfo: 'מידע נוסף'
            }];
            setData(newData);
            showToast('נוספו נתונים חדשים בהצלחה');
        }

        localStorage.setItem('dashboardData', JSON.stringify(data));
        resetForm();
    };

    const resetForm = () => {
        setName('');
        setEmail('');
        setPhone('');
        setAddress('');
        setFormError(null);
        setShowModal(false);
    };

    const handleEdit = (item) => {
        setEditingItem(item);
        setName(item.name);
        setEmail(item.email);
        setPhone(item.phone);
        setAddress(item.address);
        setShowModal(true);
    };

    const handleDelete = (id) => {
        if (window.confirm('האם אתה בטוח שברצונך למחוק נתון זה?')) {
            const updatedData = data.filter(item => item.id !== id);
            setData(updatedData);
            localStorage.setItem('dashboardData', JSON.stringify(updatedData));
            showToast('הנתון נמחק בהצלחה');
        }
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilterCriteria(prev => ({ ...prev, [name]: value }));
    };

    const handleSort = (column) => {
        setSortColumn(column);
        setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    };

    const getSortIcon = (column) => {
        if (sortColumn !== column) return '↕️';
        return sortDirection === 'asc' ? '↑' : '↓';
    };

    // Card View Component
    const CardView = ({ item }) => (
        <div className="card h-100">
            <div className="card-body d-flex flex-column">
                <h5 className="card-title">{item.name}</h5>
                <p className="card-text">אימייל: {item.email}</p>
                <p className="card-text">טלפון: {item.phone}</p>
                <p className="card-text">כתובת: {item.address}</p>
                <div className="mt-auto">
                    <button className="btn btn-link p-0 me-3" onClick={() => handleEdit(item)}>✏️</button>
                    <button className="btn btn-link p-0 me-3" onClick={() => handleDelete(item.id)}>🗑️</button>
                    <button
                        className="btn btn-link p-0"
                        onClick={() => toggleRow(item.id)}
                    >
                        {expandedRow === item.id ? '▲' : '▼'}
                    </button>
                </div>
                {expandedRow === item.id && (
                    <div className="mt-2">
                        <p><strong>מידע נוסף:</strong> {item.additionalInfo}</p>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="container mt-5">
            {/* Header Section */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2>לוח בקרה</h2>
                <div>
                    <button className="btn btn-success me-2" onClick={exportData}>
                        ייצוא נתונים 📊
                    </button>
                    <button
                        className={`btn btn-outline-primary me-2 ${viewType === 'table' ? 'active' : ''}`}
                        onClick={() => setViewType('table')}
                        title="תצוגת טבלה"
                    >
                        📋
                    </button>
                    <button
                        className={`btn btn-outline-primary ${viewType === 'card' ? 'active' : ''}`}
                        onClick={() => setViewType('card')}
                        title="תצוגת כרטיסיות"
                    >
                        🗂️
                    </button>
                </div>
            </div>

            {/* Search Section */}
            <div className="mb-3">
                <input
                    type="text"
                    className="form-control mb-3"
                    placeholder="חיפוש גלובלי..."
                    value={globalSearch}
                    onChange={(e) => setGlobalSearch(e.target.value)}
                />

                <div className="d-flex gap-2">
                    <input
                        type="text"
                        className="form-control"
                        placeholder="סנן לפי שם"
                        name="name"
                        value={filterCriteria.name}
                        onChange={handleFilterChange}
                    />
                    <input
                        type="text"
                        className="form-control"
                        placeholder="סנן לפי אימייל"
                        name="email"
                        value={filterCriteria.email}
                        onChange={handleFilterChange}
                    />
                    <input
                        type="text"
                        className="form-control"
                        placeholder="סנן לפי טלפון"
                        name="phone"
                        value={filterCriteria.phone}
                        onChange={handleFilterChange}
                    />
                    <input
                        type="text"
                        className="form-control"
                        placeholder="סנן לפי כתובת"
                        name="address"
                        value={filterCriteria.address}
                        onChange={handleFilterChange}
                    />
                </div>
            </div>

            {/* Main Content */}
            {viewType === 'table' ? (
                <div className="accordion" id="userAccordion">
                    {filteredData.map((item, index) => (
                        <div className="accordion-item" key={item.id}>
                            <h2 className="accordion-header">
                                <button
                                    className={`accordion-button ${expandedRow === item.id ? '' : 'collapsed'}`}
                                    type="button"
                                    onClick={() => toggleRow(item.id)}
                                    aria-expanded={expandedRow === item.id}
                                    aria-controls={`collapse${item.id}`}
                                >
                                    <div className="row w-100 align-items-center">
                                        <div className="col">{item.name}</div>
                                        <div className="col">{item.phone}</div>
                                        <div className="col">{item.email}</div>
                                        <div className="col">{item.address}</div>
                                        <div className="col">
                                            <button
                                                className="btn btn-link btn-sm p-0 me-3"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleEdit(item);
                                                }}
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                className="btn btn-link btn-sm p-0"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDelete(item.id);
                                                }}
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </div>
                                </button>
                            </h2>
                            <div
                                id={`collapse${item.id}`}
                                className={`accordion-collapse collapse ${expandedRow === item.id ? 'show' : ''}`}
                                data-bs-parent="#userAccordion"
                            >
                                <div className="accordion-body bg-light">
                                    <div className="row">
                                        <div className="col">
                                            <h6 className="mb-3">פרטים נוספים:</h6>
                                            <div className="card">
                                                <div className="card-body">
                                                    <div className="row">
                                                        <div className="col-md-6">
                                                            <p className="mb-2"><strong>שם מלא:</strong> {item.name}</p>
                                                            <p className="mb-2"><strong>טלפון:</strong> {item.phone}</p>
                                                            <p className="mb-2"><strong>אימייל:</strong> {item.email}</p>
                                                            <p className="mb-2"><strong>כתובת:</strong> {item.address}</p>
                                                        </div>
                                                        <div className="col-md-6">
                                                            <p className="mb-2"><strong>מידע נוסף:</strong></p>
                                                            <p>{item.additionalInfo}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="row row-cols-1 row-cols-md-3 g-4">
                    {filteredData.map(item => (
                        <div key={item.id} className="col">
                            <CardView item={item} />
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            <div className={`modal fade ${showModal ? 'show d-block' : ''}`} tabIndex="-1">
                <div className="modal-dialog">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">
                                {editingItem ? 'ערוך נתונים' : 'הוסף נתונים חדשים'}
                            </h5>
                            <button
                                type="button"
                                className="btn-close"
                                onClick={resetForm}
                                aria-label="Close"
                            ></button>
                        </div>
                        <div className="modal-body">
                            {formError && (
                                <div className="alert alert-danger">{formError}</div>
                            )}
                            <form>
                                <div className="mb-3">
                                    <label htmlFor="name" className="form-label">שם</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        id="name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                    />
                                </div>
                                <div className="mb-3">
                                    <label htmlFor="email" className="form-label">אימייל</label>
                                    <input
                                        type="email"
                                        className="form-control"
                                        id="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                                <div className="mb-3">
                                    <label htmlFor="phone" className="form-label">טלפון</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        id="phone"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                    />
                                </div>
                                <div className="mb-3">
                                    <label htmlFor="address" className="form-label">כתובת</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        id="address"
                                        value={address}
                                        onChange={(e) => setAddress(e.target.value)}
                                    />
                                </div>
                            </form>
                        </div>
                        <div className="modal-footer">
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={resetForm}
                            >
                                ביטול
                            </button>
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={handleAddOrUpdateData}
                            >
                                {editingItem ? 'עדכן' : 'הוסף'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal Backdrop */}
            {showModal && <div className="modal-backdrop fade show"></div>}
        </div>
    );
};

export default UserTable;