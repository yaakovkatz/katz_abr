    import React, { useState, useEffect } from 'react';
    import axios from 'axios';
    
    axios.defaults.baseURL = 'http://localhost:3001';
    
    // קומפוננטת תצוגת כרטיסיה
    const CardView = ({ item, handleEdit, handleDelete, expandedRow, toggleRow }) => (
        <div className="card h-100 text-end">
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
    
    // הקומפוננטה הראשית
    const UserTable = ({ showModal, setShowModal, userId }) => {
        console.log('UserTable received userId:', userId);
    
        // ניהול מצב הטופס
        const [name, setName] = useState('');
        const [email, setEmail] = useState('');
        const [phone, setPhone] = useState('');
        const [address, setAddress] = useState('');
        const [formError, setFormError] = useState(null);
    
        // ניהול מצב הנתונים והתצוגה
        const [data, setData] = useState([]);
        const [filteredData, setFilteredData] = useState(data);
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
    
        useEffect(() => {
            if (data) {
                setFilteredData(data);
            }
        }, [data]);
    
        // טעינת נתונים ראשונית
        useEffect(() => {
            const fetchData = async () => {
                try {
                    const response = await axios.get(`/api/dashboard-data`, {
                        params: { userId }
                    });
                    setData(response.data);
                    setFilteredData(response.data);
                } catch (error) {
                    showToast('שגיאה בטעינת נתונים', 'error');
                }
            };
    
            if (userId) {
                fetchData();
            }
        }, [userId]);
    
        // פונקציות טיפול במידע
        const handleEdit = (item) => {
            // לוגים לדיבאג
            const currentUserId = localStorage.getItem('userId');
            console.log('Current userId from props:', userId);
            console.log('Current userId from localStorage:', currentUserId);
            console.log('Editing item:', item);
    
            setEditingItem(item);
            setName(item.name);
            setEmail(item.email);
            setPhone(item.phone);
            setAddress(item.address);
            setShowModal(true);
        };
    
        const handleDelete = async (id) => {
            if (window.confirm('האם אתה בטוח שברצונך למחוק נתון זה?')) {
                try {
                    await axios.delete(`/api/dashboard-data/${id}`, {
                        params: { userId }
                    });
                    setData(data.filter(item => item.id !== id));
                    showToast('הנתון נמחק בהצלחה');
                } catch (error) {
                    showToast('שגיאה במחיקת נתונים', 'error');
                }
            }
        };
    
        const toggleRow = (id) => {
            setExpandedRow(expandedRow === id ? null : id);
        };
    
        // פונקציות עזר
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
    
        const handleAddOrUpdateData = async () => {
            if (!validateForm()) return;
    
            console.log('userId before sending:', userId);
    
            try {
                if (editingItem) {  // השארנו רק if אחד
                    console.log('Editing item:', editingItem);
                    console.log('UserId:', userId);
    
                    const response = await axios.put(
                        `/api/dashboard-data/${editingItem.id}`,
                        {
                            name,
                            email,
                            phone,
                            address,
                            userId: parseInt(userId)  // הוספנו המרה למספר
                        }
                    );
    
                    const updatedData = data.map(item =>
                        item.id === editingItem.id ? response.data : item
                    );
                    setData(updatedData);
                    setEditingItem(null);
                    showToast('הנתונים עודכנו בהצלחה');
                } else {
                    const response = await axios.post('/api/dashboard-data', {
                        userId,
                        name,
                        email,
                        phone,
                        address
                    });
                    const refreshResponse = await axios.get('/api/dashboard-data', {
                        params: { userId }
                    });
    
                    setData(refreshResponse.data);
                    setFilteredData(refreshResponse.data);
                    showToast('נוספו נתונים חדשים בהצלחה');
                }
                resetForm();
            } catch (error) {
                showToast('שגיאה בשמירת נתונים', 'error');
            }
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
    
        const exportData = () => {
            const dataStr = JSON.stringify(filteredData, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
            const exportFileDefaultName = 'dashboard-data.json';
            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', exportFileDefaultName);
            linkElement.click();
            showToast('הנתונים יוצאו בהצלחה');
        };
    
        // פילטור ומיון נתונים
        useEffect(() => {
            let filtered = data;
    
            // Global search
            if (globalSearch) {
                filtered = filtered.filter(item =>
                    Object.values(item).some(val =>
                        val?.toString().toLowerCase().includes(globalSearch.toLowerCase())
                    )
                );
            }
    
            // Specific filters
            filtered = filtered.filter(item =>
                Object.keys(filterCriteria).every(key =>
                    item[key]?.toString().toLowerCase().includes(filterCriteria[key].toLowerCase())
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
    
        return (
            <div className="container mt-5 text-end">
                {/* כותרת וכפתורי פעולה */}
                <div className="d-flex flex-row-reverse justify-content-between align-items-center mb-4">
                    <h2>לוח בקרה</h2>
                    <div>
                        <button
                            className="btn btn-primary me-2"
                            onClick={() => setShowModal(true)}
                        >
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
    
                {/* חיפוש וסינון */}
                <div className="mb-3">
                    <input
                        type="text"
                        className="form-control mb-3 text-end"
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
                            onChange={(e) => setFilterCriteria(prev => ({
                                ...prev,
                                name: e.target.value
                            }))}
                        />
                        <input
                            type="text"
                            className="form-control"
                            placeholder="סנן לפי אימייל"
                            name="email"
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
                            name="phone"
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
                            name="address"
                            value={filterCriteria.address}
                            onChange={(e) => setFilterCriteria(prev => ({
                                ...prev,
                                address: e.target.value
                            }))}
                        />
                    </div>
                </div>
    
                {/* תצוגת נתונים */}
                {viewType === 'table' ? (
                    <div className="accordion" id="userAccordion">
                        {filteredData.map((item, index) => (
                            <div className="accordion-item" key={item.id}>
                                <h2 className="accordion-header">
                                    <button className={`accordion-button ${expandedRow === item.id ? '' : 'collapsed'}`}
                                            onClick={() => toggleRow(item.id)}>
                                        <div className="row w-100 align-items-center">
                                            <div className="col text-end">{item.name}</div>
                                            <div className="col text-end">{item.email}</div>
                                            <div className="col text-end">{item.phone}</div>
                                            <div className="col text-end">{item.address}</div>
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
                                <CardView
                                    item={item}
                                    handleEdit={handleEdit}
                                    handleDelete={handleDelete}
                                    expandedRow={expandedRow}
                                    toggleRow={toggleRow}
                                />
                            </div>
                        ))}
                    </div>
                )}
    
                {/* מודל הוספה/עריכה */}
                {showModal && (
                    <>
                        <div className="modal show d-block">
                            <div className="modal-dialog">
                                <div className="modal-content text-end">
                                    <div className="modal-header flex-row-reverse">
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
                                    <div className="modal-footer flex-row-reverse">
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