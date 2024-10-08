import React, { useState, useEffect } from 'react';

const UserTable = () => {
    const [users, setUsers] = useState([]);

    // טעינת נתוני המשתמשים מהשרת
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const response = await fetch('/api/users');
                const data = await response.json();
                setUsers(data);
            } catch (error) {
                console.error('Error fetching users:', error);
            }
        };
        fetchUsers();
    }, []);

    // פונקציית מחיקה
    const handleDelete = (id) => {
        // לוגיקה למחיקת משתמש
        console.log(`User with ID ${id} deleted`);
    };

    // פונקציית עריכה
    const handleEdit = (id) => {
        // לוגיקה לעריכת משתמש
        console.log(`User with ID ${id} edited`);
    };

    return (
        <table className="table table-striped table-bordered">
            <thead>
            <tr>
                <th>שם</th>
                <th>טלפון</th>
                <th>אימייל</th>
                <th>מוצר</th>
                <th>פעולות</th>
            </tr>
            </thead>
            <tbody>
            {users.map((user) => (
                <tr key={user.id}>
                    <td>{user.name}</td>
                    <td>{user.phone}</td>
                    <td>{user.email}</td>
                    <td>{user.product}</td>
                    <td>
                        <button onClick={() => handleEdit(user.id)} className="btn btn-primary btn-sm me-2">
                            <i className="bi bi-pencil"></i> עריכה
                        </button>
                        <button onClick={() => handleDelete(user.id)} className="btn btn-danger btn-sm">
                            <i className="bi bi-trash"></i> מחיקה
                        </button>
                    </td>
                </tr>
            ))}
            </tbody>
        </table>
    );
};

export default UserTable;
