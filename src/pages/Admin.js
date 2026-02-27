import React, { useState, useEffect } from 'react';
import { getBlogs } from './blogStorage';
import { getFAQs, deleteQuestion, addFAQ, updateFAQ } from './faqStorage';
import BlogImage from '../assets/Blog_Page_Image.png';
import RichTextEditor from '../components/RichTextEditor';
import './Admin.css';
import { endpoints } from '../config/api';



const getCurrentFormattedDate = () => {
    const date = new Date();
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
};

const Admin = () => {

    // Authentication state
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loginData, setLoginData] = useState({ email: '', password: '' });
    const [loginError, setLoginError] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);

    // Check localStorage for saved authentication on mount
    useEffect(() => {
        // 1. Check for active session
        const savedAuth = localStorage.getItem('adminAuth');
        if (savedAuth) {
            try {
                const authData = JSON.parse(savedAuth);
                if (authData.isAuthenticated && authData.email) {
                    setIsAuthenticated(true);
                    setView('blogs'); // Ensure default view is blogs
                    setLoginData(prev => ({ ...prev, email: authData.email }));
                    // Show header first (instant, no scroll animation)
                    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
                }
            } catch (e) {
                localStorage.removeItem('adminAuth');
            }
        } else {
            // 2. If not logged in, check for saved credentials to pre-fill
            const savedCreds = localStorage.getItem('savedCredentials');
            if (savedCreds) {
                try {
                    const creds = JSON.parse(savedCreds);
                    setLoginData(creds);
                    setRememberMe(true);
                } catch (e) {
                    localStorage.removeItem('savedCredentials');
                }
            }
        }
    }, []);

    // Blog management state
    const [blogs, setBlogs] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('Organiser'); // Default to Organiser
    const [viewingBlog, setViewingBlog] = useState(null); // For mini blog preview modal

    // FAQ State
    const [view, setView] = useState('blogs'); // 'blogs' or 'faqs'
    const [faqs, setFaqs] = useState([]);
    const [selectedFAQCategory, setSelectedFAQCategory] = useState('Organiser'); // FAQ specific filter


    // FAQ Form State
    const [isAddingFAQ, setIsAddingFAQ] = useState(false);
    const [isEditingFAQ, setIsEditingFAQ] = useState(false);
    const [selectedFAQ, setSelectedFAQ] = useState(null);
    const [faqFormData, setFaqFormData] = useState({
        question: '',
        answer: '',
        category: 'Organiser'
    });

    // Change Password State
    const [showChangePassword, setShowChangePassword] = useState(false);
    const [passwordFormData, setPasswordFormData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');
    const [isChangingPassword, setIsChangingPassword] = useState(false);

    // Password visibility toggles
    const [showLoginPassword, setShowLoginPassword] = useState(false);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Load blogs and FAQs on mount
    const fetchBlogs = async () => {
        const data = await getBlogs();
        setBlogs(data);
    };

    useEffect(() => {
        fetchBlogs();

        const loadFAQs = async () => {
            const loadedFAQs = await getFAQs();
            // Reverse the array so newest FAQs appear first
            setFaqs(loadedFAQs.reverse());
        };
        loadFAQs();

        const handleStorageUpdate = () => loadFAQs();
        window.addEventListener('faq-storage-update', handleStorageUpdate);
        return () => window.removeEventListener('faq-storage-update', handleStorageUpdate);
    }, []);

    const [selectedBlog, setSelectedBlog] = useState(null);
    const [isAdding, setIsAdding] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        date: getCurrentFormattedDate(),

        summary: '',
        content: '',
        category: 'Individual'
    });

    // Handle login input changes
    const handleLoginInputChange = (e) => {
        const { name, value } = e.target;
        setLoginData(prev => ({
            ...prev,
            [name]: value
        }));
        setLoginError(''); // Clear error when user types
    };

    // Handle login submission
    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoggingIn(true);
        setLoginError('');

        try {
            const response = await fetch(endpoints.adminLogin(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(loginData),
            });

            const data = await response.json();

            if (data.success) {
                setIsAuthenticated(true);
                setView('blogs'); // Force default view to Blogs
                setLoginError('');

                // Show header first (instant, no scroll animation)
                window.scrollTo({ top: 0, left: 0, behavior: 'instant' });

                // Save session state (Auto-login)
                if (rememberMe) {
                    localStorage.setItem('adminAuth', JSON.stringify({
                        isAuthenticated: true,
                        email: loginData.email
                    }));
                }

                // Save credentials for pre-fill (separate from session)
                if (rememberMe) {
                    localStorage.setItem('savedCredentials', JSON.stringify(loginData));
                } else {
                    localStorage.removeItem('savedCredentials');
                }

            } else {
                setLoginError(data.message || 'Invalid email or password');
            }
        } catch (error) {
            console.error('Login error:', error);
            setLoginError('Server error. Please try again later.');
        } finally {
            setIsLoggingIn(false);
        }
    };

    // Handle logout - clears session but keeps credentials if they were saved
    const handleLogout = () => {
        setIsAuthenticated(false);
        localStorage.removeItem('adminAuth'); // End session

        // Check if we have saved credentials to restore
        const savedCreds = localStorage.getItem('savedCredentials');
        if (savedCreds) {
            try {
                const creds = JSON.parse(savedCreds);
                setLoginData(creds);
                setRememberMe(true);
            } catch (e) {
                setLoginData({ email: '', password: '' });
                setRememberMe(false);
            }
        } else {
            setLoginData({ email: '', password: '' });
            setRememberMe(false);
        }
    };

    // Handle full logout - clears all saved credentials and session
    const handleForgetMe = () => {
        setIsAuthenticated(false);
        setLoginData({ email: '', password: '' });
        setRememberMe(false);
        localStorage.removeItem('adminAuth');
        localStorage.removeItem('savedCredentials');
    };

    // Change Password Handlers
    const handlePasswordInputChange = (e) => {
        const { name, value } = e.target;
        setPasswordFormData(prev => ({
            ...prev,
            [name]: value
        }));
        setPasswordError('');
        setPasswordSuccess('');
    };

    const resetPasswordForm = () => {
        setPasswordFormData({
            currentPassword: '',
            newPassword: '',
            confirmPassword: ''
        });
        setPasswordError('');
        setPasswordSuccess('');
        setShowChangePassword(false);
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setPasswordError('');
        setPasswordSuccess('');

        // Validate passwords match
        if (passwordFormData.newPassword !== passwordFormData.confirmPassword) {
            setPasswordError('New passwords do not match');
            return;
        }

        // Validate password length
        if (passwordFormData.newPassword.length < 6) {
            setPasswordError('New password must be at least 6 characters long');
            return;
        }

        setIsChangingPassword(true);

        try {
            const response = await fetch(endpoints.adminChangePassword(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: loginData.email,
                    currentPassword: passwordFormData.currentPassword,
                    newPassword: passwordFormData.newPassword
                }),
            });

            const data = await response.json();

            if (data.success) {
                setPasswordSuccess('Password changed successfully!');
                // Clear the form after success
                setTimeout(() => {
                    resetPasswordForm();
                }, 2000);
            } else {
                setPasswordError(data.message || 'Failed to change password');
            }
        } catch (error) {
            console.error('Change password error:', error);
            setPasswordError('Server error. Please try again later.');
        } finally {
            setIsChangingPassword(false);
        }
    };


    // Reset form
    const resetForm = () => {
        setFormData({
            title: '',
            date: getCurrentFormattedDate(),

            summary: '',
            content: '',
            category: 'Individual',
            image: null
        });
        setSelectedBlog(null);
        setIsAdding(false);
        setIsEditing(false);
        setShowDeleteConfirm(false);
    };
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Handle image file selection
    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({
                    ...prev,
                    image: reader.result
                }));
            };
            reader.readAsDataURL(file);
        }
    };

    // Handle remove image
    const handleRemoveImage = () => {
        setFormData(prev => ({
            ...prev,
            image: BlogImage
        }));
        // Clear file input
        const fileInput = document.getElementById('blog-image-input');
        if (fileInput) fileInput.value = '';
    };

    // Handle rich text content changes
    const handleContentChange = (htmlContent) => {
        setFormData(prev => ({
            ...prev,
            content: htmlContent
        }));
    };

    // Add new blog
    const handleAddBlog = async () => {
        const newBlog = {
            title: formData.title,
            date: formData.date,
            summary: formData.summary,
            content: formData.content,
            image: formData.image || BlogImage,
            category: formData.category
        };

        try {
            const response = await fetch(endpoints.blogs(), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newBlog)
            });
            if (response.ok) {
                await fetchBlogs();
                resetForm();
            } else {
                alert('Failed to add blog');
            }
        } catch (error) {
            console.error('Error adding blog:', error);
            alert('Error adding blog');
        }
    };

    // Edit existing blog
    const handleEditClick = (blog) => {
        setSelectedBlog(blog);
        setFormData({
            title: blog.title,
            date: getCurrentFormattedDate(),
            summary: blog.summary,
            content: blog.content, // Keep HTML content for rich text editor
            image: blog.image,
            category: blog.category || 'Individual'
        });
        setIsEditing(true);
        setIsAdding(false);
    };

    // Save edited blog
    const handleSaveEdit = async () => {
        const updatedBlog = {
            title: formData.title,
            date: formData.date,
            summary: formData.summary,
            content: formData.content,
            image: formData.image || selectedBlog.image,
            category: formData.category
        };

        try {
            const response = await fetch(endpoints.blogById(selectedBlog._id), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedBlog)
            });
            if (response.ok) {
                await fetchBlogs();
                resetForm();
            } else {
                alert('Failed to update blog');
            }
        } catch (error) {
            console.error('Error updating blog:', error);
            alert('Error updating blog');
        }
    };

    // Delete blog
    const handleDeleteClick = (blog) => {
        setSelectedBlog(blog);
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        try {
            const response = await fetch(endpoints.blogById(selectedBlog._id), {
                method: 'DELETE'
            });
            if (response.ok) {
                await fetchBlogs();
                resetForm();
            } else {
                alert('Failed to delete blog');
            }
        } catch (error) {
            console.error('Error deleting blog:', error);
            alert('Error deleting blog');
        }
    };

    // View blog - opens mini preview modal
    const handleViewBlog = (id) => {
        const blog = blogs.find(b => b._id === id);
        if (blog) {
            setViewingBlog(blog);
        }
    };

    // FAQ Handlers


    const handleDeleteFAQ = async (id) => {
        if (window.confirm('Are you sure you want to delete this question?')) {
            await deleteQuestion(id);
            const updated = await getFAQs();
            setFaqs(updated.reverse());
        }
    };

    // FAQ Form Handlers
    const resetFAQForm = () => {
        setFaqFormData({
            question: '',
            answer: '',
            category: selectedFAQCategory
        });
        setSelectedFAQ(null);
        setIsAddingFAQ(false);
        setIsEditingFAQ(false);
    };

    const handleFAQInputChange = (e) => {
        const { name, value } = e.target;
        setFaqFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleFAQContentChange = (htmlContent) => {
        setFaqFormData(prev => ({
            ...prev,
            answer: htmlContent
        }));
    };

    const handleAddFAQClick = () => {
        setFaqFormData({
            question: '',
            answer: '',
            category: selectedFAQCategory
        });
        setIsAddingFAQ(true);
        setIsEditingFAQ(false);
    };

    const handleEditFAQClick = (faq) => {
        setSelectedFAQ(faq);
        setFaqFormData({
            question: faq.question,
            answer: faq.answer || '',
            category: faq.category || 'Organiser'
        });
        setIsEditingFAQ(true);
        setIsAddingFAQ(false);
    };

    const handleSaveFAQ = async () => {
        if (isAddingFAQ) {
            // Ensure status is 'answered' so it shows up on Demo page
            const payload = { ...faqFormData, status: 'answered' };
            await addFAQ(payload);
        } else if (isEditingFAQ && selectedFAQ) {
            // Include status: 'answered' when saving an answer
            const payload = {
                ...faqFormData,
                status: faqFormData.answer && faqFormData.answer.trim() !== '' ? 'answered' : 'pending'
            };
            await updateFAQ(selectedFAQ._id, payload);
        }
        const updated = await getFAQs();
        setFaqs(updated.reverse());
        resetFAQForm();
    };

    // If not authenticated, show login screen
    if (!isAuthenticated) {
        return (
            <div className="blog-admin-wrapper">
                <div className="login-container">
                    <div className="login-card">
                        <div className="login-header">
                            <div className="login-icon">🔐</div>
                            <h1>Admin Login</h1>
                            <p>Sign in to manage content</p>
                        </div>
                        <form className="login-form" onSubmit={handleLogin}>
                            <div className="login-form-group">
                                <label>Email</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={loginData.email}
                                    onChange={handleLoginInputChange}
                                    placeholder="Enter your email"
                                    required
                                />
                            </div>
                            <div className="login-form-group">
                                <label>Password</label>
                                <div className="password-input-wrapper">
                                    <input
                                        type={showLoginPassword ? "text" : "password"}
                                        name="password"
                                        value={loginData.password}
                                        onChange={handleLoginInputChange}
                                        placeholder="Enter your password"
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="password-toggle-btn"
                                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                                        tabIndex={-1}
                                    >
                                        {showLoginPassword ? '👁️' : '👁️‍🗨️'}
                                    </button>
                                </div>
                            </div>
                            <div className="remember-me-group">
                                <label className="remember-me-label">
                                    <input
                                        type="checkbox"
                                        checked={rememberMe}
                                        onChange={(e) => setRememberMe(e.target.checked)}
                                        className="remember-me-checkbox"
                                    />
                                    <span className="checkmark"></span>
                                    Remember me
                                </label>
                            </div>
                            {loginError && (
                                <div className="login-error">
                                    <span>⚠️</span> {loginError}
                                </div>
                            )}
                            <button
                                type="submit"
                                className="login-submit-btn"
                                disabled={isLoggingIn}
                            >
                                {isLoggingIn ? 'Signing in...' : 'Sign In'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        );
    }

    // Authenticated: Show admin dashboard
    return (

        <div className="blog-admin-wrapper">
            {/* Header */}
            <header className="admin-header">
                <div className="admin-header-content">
                    <h1>Admin Dashboard</h1>

                </div>
                <div className="header-buttons">
                    <button className={`nav-btn ${view === 'blogs' ? 'active' : ''}`} onClick={() => setView('blogs')}>Blogs</button>
                    <button className={`nav-btn ${view === 'faqs' ? 'active' : ''}`} onClick={() => setView('faqs')}>FAQs</button>
                    <button className="nav-btn" onClick={() => setShowChangePassword(true)}>Change Password</button>

                    <button className="logout-btn" onClick={handleLogout}>
                        Logout
                    </button>
                    {localStorage.getItem('adminAuth') && (
                        <button className="forget-me-btn" onClick={handleForgetMe} title="Clear saved credentials">
                            Forget me
                        </button>
                    )}
                </div>
            </header>

            {/* Change Password Modal */}
            {showChangePassword && (
                <div className="modal-overlay">
                    <div className="blog-modal-content password-modal">
                        <div className="modal-header">
                            <h2>Change Password</h2>
                            <button className="close-btn" onClick={resetPasswordForm}>×</button>
                        </div>
                        <form className="blog-form" onSubmit={handleChangePassword}>
                            <div className="form-group">
                                <label>Current Password *</label>
                                <div className="password-input-wrapper">
                                    <input
                                        type={showCurrentPassword ? "text" : "password"}
                                        name="currentPassword"
                                        value={passwordFormData.currentPassword}
                                        onChange={handlePasswordInputChange}
                                        placeholder="Enter your current password"
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="password-toggle-btn"
                                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                        tabIndex={-1}
                                    >
                                        {showCurrentPassword ? '👁️' : '👁️‍🗨️'}
                                    </button>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>New Password *</label>
                                <div className="password-input-wrapper">
                                    <input
                                        type={showNewPassword ? "text" : "password"}
                                        name="newPassword"
                                        value={passwordFormData.newPassword}
                                        onChange={handlePasswordInputChange}
                                        placeholder="Enter new password (min 6 characters)"
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="password-toggle-btn"
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                        tabIndex={-1}
                                    >
                                        {showNewPassword ? '👁️' : '👁️‍🗨️'}
                                    </button>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Re-type New Password *</label>
                                <div className="password-input-wrapper">
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        name="confirmPassword"
                                        value={passwordFormData.confirmPassword}
                                        onChange={handlePasswordInputChange}
                                        placeholder="Confirm new password"
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="password-toggle-btn"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        tabIndex={-1}
                                    >
                                        {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                                    </button>
                                </div>
                            </div>
                            {passwordError && (
                                <div className="password-error">
                                    <span>⚠️</span> {passwordError}
                                </div>
                            )}
                            {passwordSuccess && (
                                <div className="password-success">
                                    <span>✅</span> {passwordSuccess}
                                </div>
                            )}
                            <div className="form-actions">
                                <button type="button" className="cancel-btn" onClick={resetPasswordForm}>Cancel</button>
                                <button type="submit" className="submit-btn" disabled={isChangingPassword}>
                                    {isChangingPassword ? 'Changing...' : 'Change Password'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {view === 'blogs' ? (
                /* Main Content - BLOGS */
                <div className="admin-container">
                    {/* Filter Tabs */}
                    <div className="admin-tabs">
                        <button
                            className={`organiser-tab ${selectedCategory === 'Organiser' ? 'active' : ''}`}
                            onClick={() => setSelectedCategory('Organiser')}
                        >
                            <span>Organiser</span>
                        </button>
                        <button
                            className={`individual-tab ${selectedCategory === 'Individual' ? 'active' : ''}`}
                            onClick={() => setSelectedCategory('Individual')}
                        >
                            <span>Individual</span>
                        </button>
                    </div>

                    {/* Actions Bar */}
                    <div className="admin-actions">
                        <button
                            className="add-btn"
                            onClick={() => { setIsAdding(true); setIsEditing(false); setShowDeleteConfirm(false); }}
                        >
                            + Add New Blog
                        </button>
                        <span className="blog-count">{blogs.length} blogs</span>
                    </div>

                    {/* Add/Edit Form Modal */}
                    {(isAdding || isEditing) && (
                        <div className="modal-overlay">
                            <div className="blog-modal-content">
                                <div className="modal-header">
                                    <h2>{isAdding ? 'Add New Blog' : 'Edit Blog'}</h2>
                                    <button className="close-btn" onClick={resetForm}>×</button>
                                </div>
                                <form className="blog-form" onSubmit={(e) => {
                                    e.preventDefault();
                                    isAdding ? handleAddBlog() : handleSaveEdit();
                                }}>
                                    <div className="form-group">
                                        <label>Title *</label>
                                        <input
                                            type="text"
                                            name="title"
                                            value={formData.title}
                                            onChange={handleInputChange}
                                            placeholder="Enter blog title"
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Category *</label>
                                        <div className="category-selection">
                                            <label className="radio-label">
                                                <input
                                                    type="radio"
                                                    name="category"
                                                    value="Individual"
                                                    checked={formData.category === 'Individual'}
                                                    onChange={handleInputChange}
                                                />
                                                <span>Individual</span>
                                            </label>
                                            <label className="radio-label">
                                                <input
                                                    type="radio"
                                                    name="category"
                                                    value="Organiser"
                                                    checked={formData.category === 'Organiser'}
                                                    onChange={handleInputChange}
                                                />
                                                <span>Organiser</span>
                                            </label>
                                        </div>
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Date *</label>
                                            <input
                                                type="text"
                                                name="date"
                                                value={formData.date}
                                                onChange={handleInputChange}
                                                placeholder="e.g., January 8, 2026"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label>Summary *</label>
                                        <textarea
                                            name="summary"
                                            value={formData.summary}
                                            onChange={handleInputChange}
                                            placeholder="Brief summary of the blog post"
                                            rows="2"
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Blog Image</label>
                                        <div className="image-upload-container">
                                            <input
                                                type="file"
                                                id="blog-image-input"
                                                accept="image/*"
                                                onChange={handleImageChange}
                                                className="file-input"
                                            />
                                            <div className="image-controls">
                                                <label htmlFor="blog-image-input" className="file-input-label">
                                                    {formData.image && formData.image.trim() !== '' && formData.image !== BlogImage && !formData.image.includes('UExBQ0VIT0xERVJfSU1BR0') ? 'Change Image' : 'Choose Image'}
                                                </label>
                                                {formData.image && formData.image.trim() !== '' && formData.image !== BlogImage && !formData.image.includes('UExBQ0VIT0xERVJfSU1BR0') && (
                                                    <button
                                                        type="button"
                                                        className="remove-image-btn"
                                                        onClick={handleRemoveImage}
                                                    >
                                                        Remove Image
                                                    </button>
                                                )}
                                            </div>
                                            {formData.image && formData.image.trim() !== '' && formData.image !== BlogImage && !formData.image.includes('UExBQ0VIT0xERVJfSU1BR0') && (
                                                <div className="image-preview">
                                                    <img src={formData.image} alt="Preview" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>Content *</label>
                                        <RichTextEditor
                                            value={formData.content}
                                            onChange={handleContentChange}
                                            placeholder="Write your blog content here... Use the toolbar to format your text."
                                        />
                                    </div>
                                    <div className="form-actions">
                                        <button type="button" className="cancel-btn" onClick={resetForm}>Cancel</button>
                                        <button type="submit" className="submit-btn">
                                            {isAdding ? 'Add Blog' : 'Save Changes'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* Delete Confirmation Modal */}
                    {showDeleteConfirm && (
                        <div className="modal-overlay">
                            <div className="blog-modal-content delete-modal">
                                <div className="delete-icon">🗑️</div>
                                <h3>Delete Blog Post?</h3>
                                <p>Are you sure you want to delete "<strong>{selectedBlog?.title}</strong>"?</p>
                                <p className="warning-text">This action cannot be undone.</p>
                                <div className="form-actions">
                                    <button className="cancel-btn" onClick={resetForm}>Cancel</button>
                                    <button className="delete-confirm-btn" onClick={confirmDelete}>Delete</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Blog Table */}
                    <div className="blog-table-container">
                        <table className="blog-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Title</th>
                                    <th>Date</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {/* Show all blogs regardless of category for now */}
                                {blogs.filter(blog => blog.category === selectedCategory).map((blog) => (
                                    <tr key={blog._id || Math.random()}>
                                        <td className="id-cell">{(blog._id || 'N/A').substring(0, 8)}...</td>
                                        <td className="title-cell">
                                            <div className="title-wrapper">
                                                {blog.image && blog.image.trim() !== '' && blog.image !== BlogImage && !blog.image.includes('UExBQ0VIT0xERVJfSU1BR0') && (
                                                    <img src={blog.image} alt="" className="blog-thumbnail" />
                                                )}
                                                <span>{blog.title}</span>
                                            </div>
                                        </td>
                                        <td className="date-cell">{blog.date}</td>
                                        <td className="actions-cell">
                                            <button
                                                className="action-btn view-btn"
                                                onClick={() => handleViewBlog(blog._id)}
                                                title="View"
                                            >
                                                👁️
                                            </button>
                                            <button
                                                className="action-btn edit-btn"
                                                onClick={() => handleEditClick(blog)}
                                                title="Edit"
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                className="action-btn delete-btn"
                                                onClick={() => handleDeleteClick(blog)}
                                                title="Delete"
                                            >
                                                🗑️
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                /* Main Content - FAQS */
                <div className="admin-container">
                    {/* FAQ Filter Tabs */}
                    <div className="admin-tabs">
                        <button
                            className={`organiser-tab ${selectedFAQCategory === 'Organiser' ? 'active' : ''}`}
                            onClick={() => setSelectedFAQCategory('Organiser')}
                        >
                            <span>Organiser</span>
                        </button>
                        <button
                            className={`individual-tab ${selectedFAQCategory === 'Individual' ? 'active' : ''}`}
                            onClick={() => setSelectedFAQCategory('Individual')}
                        >
                            <span>Individual</span>
                        </button>
                    </div>

                    <div className="admin-actions">
                        <button
                            className="add-btn"
                            onClick={handleAddFAQClick}
                        >
                            + Add New FAQ
                        </button>
                        <span className="blog-count">{faqs.filter(f => f.category === selectedFAQCategory).length} FAQs</span>
                    </div>

                    {/* FAQ Table */}
                    <div className="blog-table-container">
                        <table className="blog-table">
                            <thead>
                                <tr>
                                    <th>Question</th>
                                    <th>Category</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {faqs.filter(f => f.category === selectedFAQCategory).map((faq) => (
                                    <tr key={faq._id || Math.random()}>
                                        <td className="title-cell" style={{ maxWidth: '400px' }}>
                                            <span>{faq.question}</span>
                                        </td>
                                        <td>{faq.category}</td>
                                        <td>
                                            <span className={`status-badge ${faq.status || 'pending'}`}>
                                                {faq.status || 'pending'}
                                            </span>
                                        </td>
                                        <td className="actions-cell">
                                            <button
                                                className="action-btn edit-btn"
                                                onClick={() => handleEditFAQClick(faq)}
                                                title="Edit/Answer"
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                className="action-btn delete-btn"
                                                onClick={() => handleDeleteFAQ(faq._id)}
                                                title="Delete"
                                            >
                                                🗑️
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Add/Edit FAQ Modal */}
                    {(isAddingFAQ || isEditingFAQ) && (
                        <div className="modal-overlay">
                            <div className="blog-modal-content">
                                <div className="modal-header">
                                    <h2>{isAddingFAQ ? 'Add New FAQ' : 'Edit FAQ'}</h2>
                                    <button className="close-btn" onClick={resetFAQForm}>×</button>
                                </div>
                                <form className="blog-form" onSubmit={(e) => {
                                    e.preventDefault();
                                    handleSaveFAQ();
                                }}>
                                    <div className="form-group">
                                        <label>Question *</label>
                                        <input
                                            type="text"
                                            name="question"
                                            value={faqFormData.question}
                                            onChange={handleFAQInputChange}
                                            placeholder="Enter the FAQ question"
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Category *</label>
                                        <div className="category-selection">
                                            <label className="radio-label">
                                                <input
                                                    type="radio"
                                                    name="category"
                                                    value="Individual"
                                                    checked={faqFormData.category === 'Individual'}
                                                    onChange={handleFAQInputChange}
                                                />
                                                <span>Individual</span>
                                            </label>
                                            <label className="radio-label">
                                                <input
                                                    type="radio"
                                                    name="category"
                                                    value="Organiser"
                                                    checked={faqFormData.category === 'Organiser'}
                                                    onChange={handleFAQInputChange}
                                                />
                                                <span>Organiser</span>
                                            </label>
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>Answer *</label>
                                        <RichTextEditor
                                            value={faqFormData.answer}
                                            onChange={handleFAQContentChange}
                                            placeholder="Write the answer here..."
                                        />
                                    </div>
                                    <div className="form-actions">
                                        <button type="button" className="cancel-btn" onClick={resetFAQForm}>Cancel</button>
                                        <button type="submit" className="submit-btn">
                                            {isAddingFAQ ? 'Add FAQ' : 'Save FAQ'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            )}
            {/* Mini Blog Preview Modal */}
            {viewingBlog && (
                <div className="blog-preview-overlay" onClick={() => setViewingBlog(null)}>
                    <div className="blog-preview-modal" onClick={(e) => e.stopPropagation()}>
                        <button className="blog-preview-close" onClick={() => setViewingBlog(null)}>×</button>
                        <div className="blog-preview-content">
                            {viewingBlog.image && viewingBlog.image.trim() !== '' && !viewingBlog.image.includes('UExBQ0VIT0xERVJfSU1BR0') && (
                                <img src={viewingBlog.image} alt={viewingBlog.title} className="blog-preview-image" />
                            )}
                            <div className="blog-preview-meta">
                                <span className="blog-preview-category">{viewingBlog.category}</span>
                                <span className="blog-preview-date">{viewingBlog.date}</span>
                            </div>
                            <h2 className="blog-preview-title">{viewingBlog.title}</h2>
                            {viewingBlog.summary && <p className="blog-preview-summary">{viewingBlog.summary}</p>}
                            <div className="blog-preview-body" dangerouslySetInnerHTML={{ __html: viewingBlog.content }} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Admin;
