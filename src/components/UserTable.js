import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API_URL = 'http://localhost:10000';

const UserTable = ({ showModal, setShowModal }) => {
    const { user, loading } = useAuth();

    // States
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [formError, setFormError] = useState(null);
    const [data, setData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [globalSearch, setGlobalSearch] = useState('');
    const [expandedRow, setExpandedRow] = useState(null);
    const [filterCriteria, setFilterCriteria] = useState({
        name: '',
        email: '',
        phone: '',
        address: ''
    });
    const [sortColumn, setSortColumn] = useState('name');
    const [sortDirection, setSortDirection] = useState('asc');
    const [viewType, setViewType] = useState('table');
    const [editingItem, setEditingItem] = useState(null);

    // Fetch Data
    useEffect(() => {
        const fetchData = async () => {
            if (user?.id) {
                try {
                    const response = await axios.get(`${API_URL}/api/dashboard-data`, {
                        params: { userId: user.id }
                    });
                    setData(response.data.data);
                    setFilteredData(response.data.data);
                } catch (error) {
                    console.error('Error fetching data:', error);
                    showToast('שגיאה בטעינת נתונים', 'error');
                }
            }
        };
        fetchData();
    }, [user?.id]);

    // Filter and Sort Data
    useEffect(() => {
        let filtered = data;

        if (globalSearch) {
            filtered = filtered.filter(item =>
                Object.values(item).some(val =>
                    val?.toString().toLowerCase().includes(globalSearch.toLowerCase())
                )
            );
        }

        filtered = filtered.filter(item =>
            Object.keys(filterCriteria).every(key =>
                item[key]?.toString().toLowerCase().includes(filterCriteria[key].toLowerCase())
            )
        );

        filtered.sort((a, b) => {
            if (a[sortColumn] < b[sortColumn]) return sortDirection === 'asc' ? -1 : 1;
            if (a[sortColumn] > b[sortColumn]) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        setFilteredData(filtered);
    }, [data, filterCriteria, sortColumn, sortDirection, globalSearch]);

    // Validate Form
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

    const resetForm = () => {
        setName('');
        setEmail('');
        setPhone('');
        setAddress('');
        setFormError(null);
        setEditingItem(null);
        setShowModal(false);
    };

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

    const handleEdit = (item) => {
        setEditingItem(item);
        setName(item.name);
        setEmail(item.email);
        setPhone(item.phone);
        setAddress(item.address);
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!user?.id) {
            showToast('לא נמצא משתמש מחובר', 'error');
            return;
        }

        if (window.confirm('האם אתה בטוח שברצונך למחוק נתון זה?')) {
            try {
                await axios.delete(`${API_URL}/api/dashboard-data/${id}`, {
                    params: { userId: user.id }
                });
                const updatedData = data.filter(item => item.id !== id);
                setData(updatedData);
                setFilteredData(updatedData);
                showToast('הנתון נמחק בהצלחה');
            } catch (error) {
                showToast('שגיאה במחיקת נתונים', 'error');
            }
        }
    };

    const handleAddOrUpdateData = async () => {
        if (!validateForm()) return;
        if (!user?.id) {
            setFormError('לא נמצא משתמש מחובר');
            return;
        }

        try {
            if (editingItem) {
                await axios.put(`${API_URL}/api/dashboard-data/${editingItem.id}`, {
                    name,
                    email,
                    phone,
                    address,
                    userId: user.id
                });
                const updatedData = data.map(item =>
                    item.id === editingItem.id ? { ...item, name, email, phone, address } : item
                );
                setData(updatedData);
                setFilteredData(updatedData);
                showToast('נתונים עודכנו בהצלחה');
            } else {
                const response = await axios.post(`${API_URL}/api/dashboard-data`, {
                    name,
                    email,
                    phone,
                    address,
                    userId: user.id
                });
                const newItem = response.data;
                const updatedData = [...data, newItem];
                setData(updatedData);
                setFilteredData(updatedData);
                showToast('נוספו נתונים חדשים בהצלחה');
            }
            resetForm();
        } catch (error) {
            console.error('Error details:', error.response?.data || error);
            showToast('שגיאה בשמירת נתונים', 'error');
        }
    };

    const toggleRow = (id) => {
        setExpandedRow(expandedRow === id ? null : id);
    };

    const exportData = () => {
        const dataStr = JSON.stringify(filteredData, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        const exportFileDefaultName = 'dashboard-data.json';
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        showToast('הנתונים יוצאו בהצלחה');
    };

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
                    <button className="btn btn-link p-0" onClick={() => toggleRow(item.id)}>
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
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2>לוח בקרה</h2>
                <div>
                    <button className="btn btn-primary me-2" onClick={() => setShowModal(true)}>
                        הוסף נתונים חדשים ➕
                    </button>
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
                        value={filterCriteria.name}
                        onChange={(e) => setFilterCriteria(prev => ({
                            ...prev,
                            name: e.target.value
                        }))}
                    />
                    <input
                        type="text"
                        className="form-control"
                        placeholder="סנן לפי אימייל"
                        value={filterCriteria.email}
                        onChange={(e) => setFilterCriteria(prev => ({
                            ...prev,
                            email: e.target.value
                        }))}
                    />
                    <input
                        type="text"
                        className="form-control"
                        placeholder="סנן לפי טלפון"
                        value={filterCriteria.phone}
                        onChange={(e) => setFilterCriteria(prev => ({
                            ...prev,
                            phone: e.target.value
                        }))}
                    />
                    <input
                        type="text"
                        className="form-control"
                        placeholder="סנן לפי כתובת"
                        value={filterCriteria.address}
                        onChange={(e) => setFilterCriteria(prev => ({
                            ...prev,
                            address: e.target.value
                        }))}
                    />
                </div>
            </div>

            {viewType === 'table' ? (
                <div className="accordion" id="userAccordion">
                    {filteredData.map((item) => (
                        <div className="accordion-item" key={item.id}>
                            <h2 className="accordion-header">
                                <button
                                    className={`accordion-button ${expandedRow === item.id ? '' : 'collapsed'}`}
                                    onClick={() => toggleRow(item.id)}
                                >
                                    <div className="row w-100 align-items-center">
                                        <div className="col">{item.name}</div>
                                        <div className="col">{item.email}</div>
                                        <div className="col">{item.phone}</div>
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
                            >
                                <div className="accordion-body">
                                    <p><strong>מידע נוסף:</strong> {item.additionalInfo}</p>
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

            {showModal && (
                <>
                    <div className="modal show d-block">
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
                                    />
                                </div>
                                <div className="modal-body">
                                    {formError && <div className="alert alert-danger">{formError}</div>}
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
                                        {editingItem ? 'עדכון נתונים' : 'הוסף נתונים'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="modal-backdrop show" onClick={resetForm}></div>
                </>
            )}
        </div>
    );
};

export default UserTable;
