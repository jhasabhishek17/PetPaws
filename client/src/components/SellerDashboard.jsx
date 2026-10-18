import React, { useState, useEffect } from 'react';
import {
  Plus,
  Store,
  Package,
  DollarSign,
  Edit,
  Trash2,
  CreditCard,
  CheckCircle2,
  Truck,
  TrendingUp,
  X,
  Lock,
  Save
} from 'lucide-react';
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/auth';

/**
 * SellerDashboard Component
 * Strictly accessible only to authenticated Seller accounts (currentUser.role === 'seller').
 * Displays only the authenticated seller's own inventory (/api/pets/seller/inventory),
 * customer orders for their listings (/api/orders?sellerId=<id>), new pet creation,
 * full listing editing, and private payout settings.
 */
export default function SellerDashboard({
  currentUser,
  onAddToast,
  onPetsChanged,
  onUserUpdated,
  onOpenAuth
}) {
  const [pets, setPets] = useState([]);
  const [sellerOrders, setSellerOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory' | 'orders' | 'upload' | 'payouts'

  // Upload New Pet Form state
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Dogs');
  const [price, setPrice] = useState('');
  const [age, setAge] = useState('');
  const [breed, setBreed] = useState('');
  const [gender, setGender] = useState('Male');
  const [healthStatus, setHealthStatus] = useState('Fully Vaccinated & Health Certified');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [stock, setStock] = useState('1');

  // Edit Pet Modal state
  const [editingPet, setEditingPet] = useState(null);

  // Payout Settings state
  const [upiId, setUpiId] = useState(currentUser?.upi_id || '');
  const [bankName, setBankName] = useState(currentUser?.bank_name || '');
  const [bankAccount, setBankAccount] = useState(currentUser?.bank_account || '');
  const [ifscCode, setIfscCode] = useState(currentUser?.ifsc_code || '');

  const [message, setMessage] = useState('');

  useEffect(() => {
    if (currentUser && currentUser.role === 'seller') {
      setUpiId(currentUser.upi_id || '');
      setBankName(currentUser.bank_name || '');
      setBankAccount(currentUser.bank_account || '');
      setIfscCode(currentUser.ifsc_code || '');
      fetchSellerData();
    } else {
      setPets([]);
      setSellerOrders([]);
      setLoading(false);
    }
  }, [currentUser]);

  const fetchSellerData = async () => {
    if (!currentUser || currentUser.role !== 'seller') return;
    setLoading(true);
    try {
      const [invData, ordData] = await Promise.all([
        apiGet('/api/pets/seller/inventory'),
        apiGet(`/api/orders?sellerId=${encodeURIComponent(currentUser.id)}`)
      ]);
      if (invData.success) {
        setPets(invData.pets || []);
      }
      if (ordData.success) {
        setSellerOrders(ordData.orders || []);
      }
    } catch (err) {
      console.error('Error loading seller portal data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Block non-sellers from viewing or fetching any seller portal data
  if (!currentUser || currentUser.role !== 'seller') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center animate-fadeIn">
        <div className="bg-white rounded-3xl border border-[#EFE9DF] p-10 shadow-aesthetic">
          <div className="w-16 h-16 bg-[#FFF5F0] text-[#E07A5F] border border-[#F4C4B7] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8" />
          </div>
          <span className="inline-block px-3.5 py-1 bg-[#FFF5F0] text-[#E07A5F] border border-[#F4C4B7] text-xs font-extrabold rounded-full mb-3 uppercase tracking-wider">
            Restricted Seller Portal
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-[#231F20] font-display mb-2">
            Authenticated Seller Account Required
          </h2>
          <p className="text-sm text-[#65605B] max-w-md mx-auto mb-6">
            Seller inventory, listing creation, customer order fulfillment, and payout settings are private to verified Seller accounts.
          </p>
          {!currentUser && onOpenAuth && (
            <button
              onClick={onOpenAuth}
              className="px-6 py-3 bg-[#E07A5F] hover:bg-[#D0654A] text-white font-extrabold text-xs rounded-full shadow-md"
            >
              Sign In as Seller
            </button>
          )}
        </div>
      </div>
    );
  }

  // Submit new pet listing (authenticated seller only)
  const handleUploadPet = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      const data = await apiPost('/api/pets', {
        title,
        category,
        price: Number(price),
        age,
        breed,
        gender,
        health_status: healthStatus,
        description,
        image_url:
          imageUrl ||
          'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=800&q=80',
        stock: Number(stock)
      });
      if (data.success) {
        setMessage('Pet listed successfully on marketplace!');
        onAddToast?.('Pet listed successfully on marketplace!', 'success');
        setTitle('');
        setPrice('');
        setAge('');
        setBreed('');
        setDescription('');
        setImageUrl('');
        setStock('1');
        await fetchSellerData();
        onPetsChanged?.();
        setActiveTab('inventory');
      } else {
        onAddToast?.(data.message || 'Failed to create pet listing.', 'error');
      }
    } catch (err) {
      setMessage('Failed to upload pet post.');
      onAddToast?.('Failed to upload pet post.', 'error');
    }
  };

  // Update existing stock count
  const handleUpdateStock = async (petId, newStock) => {
    const parsed = Math.max(0, Number(newStock));
    try {
      const data = await apiPut(`/api/pets/${petId}`, { stock: parsed });
      if (data.success) {
        onAddToast?.('Stock & availability updated!', 'success');
        await fetchSellerData();
        onPetsChanged?.();
      } else {
        onAddToast?.(data.message || 'Not authorized to update this listing.', 'error');
      }
    } catch (err) {
      onAddToast?.('Failed to update stock.', 'error');
    }
  };

  // Save full Edit Pet modal changes
  const handleSaveEditPet = async (e) => {
    e.preventDefault();
    if (!editingPet) return;
    try {
      const data = await apiPut(`/api/pets/${editingPet.id}`, {
        title: editingPet.title,
        category: editingPet.category,
        price: Number(editingPet.price),
        age: editingPet.age,
        breed: editingPet.breed,
        gender: editingPet.gender,
        health_status: editingPet.health_status,
        description: editingPet.description,
        image_url: editingPet.image_url,
        stock: Math.max(0, Number(editingPet.stock))
      });
      if (data.success) {
        onAddToast?.(`Updated listing "${editingPet.title}"!`, 'success');
        setEditingPet(null);
        await fetchSellerData();
        onPetsChanged?.();
      } else {
        onAddToast?.(data.message || 'Not authorized to edit this listing.', 'error');
      }
    } catch (err) {
      onAddToast?.('Failed to update listing.', 'error');
    }
  };

  // Delete listing (strictly verified owner)
  const handleDeletePet = async (petId) => {
    try {
      const data = await apiDelete(`/api/pets/${petId}`);
      if (data.success) {
        onAddToast?.('Listing deleted.', 'info');
        await fetchSellerData();
        onPetsChanged?.();
      } else {
        onAddToast?.(data.message || 'Not authorized to delete this listing.', 'error');
      }
    } catch (err) {
      onAddToast?.('Failed to delete listing.', 'error');
    }
  };

  // Update Customer Order status
  const handleUpdateOrderStatus = async (orderId, tracking_status) => {
    try {
      const data = await apiPut(`/api/orders/${orderId}/status`, { tracking_status });
      if (data.success) {
        onAddToast?.(`Order ${orderId} status updated to ${tracking_status}`, 'success');
        await fetchSellerData();
      } else {
        onAddToast?.(data.message || 'Failed to update order status.', 'error');
      }
    } catch (err) {
      onAddToast?.('Failed to update order status.', 'error');
    }
  };

  // Save Payout Configurations
  const handleSavePayouts = async (e) => {
    e.preventDefault();
    try {
      const data = await apiPut('/api/auth/update-payout', {
        upi_id: upiId,
        bank_name: bankName,
        bank_account: bankAccount,
        ifsc_code: ifscCode
      });
      if (data.success) {
        setMessage('Payout & Payment settings updated successfully!');
        onAddToast?.('Payout settings updated!', 'success');
        if (data.user) onUserUpdated?.(data.user);
      } else {
        onAddToast?.(data.message || 'Failed to save payout settings.', 'error');
      }
    } catch (err) {
      setMessage('Failed to update payout settings.');
      onAddToast?.('Failed to update payout settings.', 'error');
    }
  };

  // Calculate statistics for authenticated seller's inventory
  const totalListings = pets.length;
  const activeStock = pets.reduce((acc, p) => acc + (Number(p.stock) || 0), 0);
  const totalValue = pets.reduce((acc, p) => acc + (Number(p.price) || 0) * (Number(p.stock) || 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      {/* Header & Role Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-black text-[#231F20] font-display">Seller Management Portal</h1>
            <span className="px-3 py-0.5 bg-[#FFF8EB] text-[#D97706] border border-[#F4A261]/40 text-xs font-extrabold rounded-full">
              {currentUser.name} • Seller ID: {currentUser.id}
            </span>
          </div>
          <p className="text-[#65605B] text-sm mt-1">
            Manage your owned pet listings, stock levels, customer orders, and private payout accounts
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex flex-wrap bg-white p-1.5 rounded-2xl border border-[#EFE9DF] shadow-sm gap-1">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
              activeTab === 'inventory'
                ? 'bg-[#231F20] text-white'
                : 'text-[#4A4344] hover:bg-[#FAF6F0]'
            }`}
          >
            My Inventory ({totalListings})
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
              activeTab === 'orders'
                ? 'bg-[#52796F] text-white'
                : 'text-[#4A4344] hover:bg-[#FAF6F0]'
            }`}
          >
            Customer Orders ({sellerOrders.length})
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center space-x-1 ${
              activeTab === 'upload'
                ? 'bg-[#E07A5F] text-white'
                : 'text-[#4A4344] hover:bg-[#FAF6F0]'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Post New Pet</span>
          </button>
          <button
            onClick={() => setActiveTab('payouts')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
              activeTab === 'payouts'
                ? 'bg-[#231F20] text-white'
                : 'text-[#4A4344] hover:bg-[#FAF6F0]'
            }`}
          >
            Payment Payouts
          </button>
        </div>
      </div>

      {/* Analytics Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-5 mb-8">
        <div className="bg-white p-5 rounded-3xl border border-[#EFE9DF] shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-[#FFF5F0] text-[#E07A5F] flex items-center justify-center">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-[#8C847C] uppercase tracking-wider">Owned Listings</span>
            <h3 className="text-2xl font-black text-[#231F20] font-display">{totalListings} Pets</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-[#EFE9DF] shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-[#EAEFE9] text-[#2A5C4A] flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-[#8C847C] uppercase tracking-wider">Total Units in Stock</span>
            <h3 className="text-2xl font-black text-[#231F20] font-display">{activeStock} Units</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-[#EFE9DF] shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-[#FFF8EB] text-[#D97706] flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-[#8C847C] uppercase tracking-wider">Inventory Value</span>
            <h3 className="text-2xl font-black text-[#231F20] font-display">${totalValue}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-[#EFE9DF] shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-[#FAF6F0] text-[#52796F] flex items-center justify-center">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-[#8C847C] uppercase tracking-wider">Customer Orders</span>
            <h3 className="text-2xl font-black text-[#231F20] font-display">{sellerOrders.length} Orders</h3>
          </div>
        </div>
      </div>

      {message && (
        <div className="mb-6 p-4 bg-[#EAEFE9] border border-[#D1E7DD] text-[#2A5C4A] text-xs font-bold rounded-2xl flex items-center justify-between">
          <div className="flex items-center">
            <CheckCircle2 className="w-4 h-4 mr-2 text-[#52796F]" />
            <span>{message}</span>
          </div>
          <button onClick={() => setMessage('')} className="text-[#2A5C4A]">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 1. Inventory Stock List */}
      {activeTab === 'inventory' && (
        <div className="bg-white rounded-3xl border border-[#EFE9DF] overflow-hidden shadow-aesthetic">
          <div className="p-6 border-b border-[#EFE9DF] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-extrabold text-[#231F20] font-display">
                My Pet Listings & Stock Inventory ({pets.length})
              </h3>
              <p className="text-xs text-[#65605B]">
                Showing all listings owned by <strong>{currentUser.name}</strong> ({currentUser.id}). Restocking a sold-out item automatically relists it as active.
              </p>
            </div>
            <button
              onClick={() => setActiveTab('upload')}
              className="px-4 py-2.5 bg-[#E07A5F] hover:bg-[#D0654A] text-white font-extrabold text-xs rounded-xl shadow-sm"
            >
              + Add New Pet Listing
            </button>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs font-bold text-[#65605B]">Loading your inventory...</div>
          ) : pets.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-sm font-bold text-[#231F20] mb-1">You have no pet listings yet</p>
              <p className="text-xs text-[#65605B] mb-4">Click "Post New Pet" to publish your first pet listing to the marketplace.</p>
              <button
                onClick={() => setActiveTab('upload')}
                className="px-5 py-2.5 bg-[#E07A5F] text-white font-extrabold text-xs rounded-full"
              >
                + Post New Pet
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF6F0] text-[#65605B] font-bold uppercase tracking-wider border-b border-[#EFE9DF]">
                  <tr>
                    <th className="px-6 py-4">Pet Listing</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Price</th>
                    <th className="px-6 py-4">Stock Quantity</th>
                    <th className="px-6 py-4">Availability Status</th>
                    <th className="px-6 py-4 text-right">Manage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFE9DF] font-medium">
                  {pets.map((pet) => {
                    const isAvailable = Number(pet.stock) > 0 && pet.status !== 'sold';
                    return (
                      <tr key={pet.id} className="hover:bg-[#FAF6F0]/60 transition-colors">
                        <td className="px-6 py-4 flex items-center space-x-3">
                          <img src={pet.image_url} alt={pet.title} className="w-12 h-12 rounded-xl object-cover border border-[#E6DCCF]" />
                          <div>
                            <p className="font-extrabold text-[#231F20]">{pet.title}</p>
                            <p className="text-[11px] text-[#65605B]">
                              Breed: {pet.breed} • Age: {pet.age} • ID: <span className="font-mono">{pet.id}</span>
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-bold text-[#4A4344]">{pet.category}</td>
                        <td className="px-6 py-4 font-black text-[#231F20]">${pet.price}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <input
                              type="number"
                              min="0"
                              aria-label={`Stock for ${pet.title}`}
                              value={pet.stock}
                              onChange={(e) => handleUpdateStock(pet.id, e.target.value)}
                              className="w-16 px-2 py-1.5 bg-[#FAF6F0] border border-[#E6DCCF] rounded-lg text-center font-extrabold text-xs text-[#231F20]"
                            />
                            <span className="text-[11px] text-[#65605B]">units</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {isAvailable ? (
                            <span className="px-3 py-1 bg-[#EAEFE9] text-[#2A5C4A] border border-[#D1E7DD] text-[10px] font-extrabold rounded-full">
                              Active Listing ({pet.stock} in stock)
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-red-50 text-red-700 border border-red-200 text-[10px] font-extrabold rounded-full">
                              Sold Out (Unlisted)
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right space-x-1.5">
                          <button
                            onClick={() => setEditingPet({ ...pet })}
                            className="p-2 text-[#4A4344] hover:text-[#E07A5F] rounded-lg hover:bg-[#FFF5F0] transition-colors inline-flex items-center"
                            title="Edit Listing"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeletePet(pet.id)}
                            className="p-2 text-[#8C847C] hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors inline-flex items-center"
                            title="Delete Listing"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 2. Customer Orders for Seller's Listings */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-3xl border border-[#EFE9DF] p-6 shadow-aesthetic">
          <div className="mb-6">
            <h3 className="text-lg font-extrabold text-[#231F20] font-display">
              Customer Orders for Your Listings ({sellerOrders.length})
            </h3>
            <p className="text-xs text-[#65605B]">
              View orders placed for your pets and update live climate-controlled transport status.
            </p>
          </div>

          {sellerOrders.length === 0 ? (
            <div className="p-10 text-center bg-[#FAF6F0] rounded-2xl border border-[#E6DCCF]">
              <Truck className="w-10 h-10 text-[#8C847C] mx-auto mb-2" />
              <p className="text-xs font-bold text-[#65605B]">No customer orders for your listings yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sellerOrders.map((ord) => (
                <div
                  key={ord.id}
                  className="p-5 rounded-2xl bg-[#FAF6F0] border border-[#E6DCCF] flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start space-x-3.5">
                    {ord.pet_image && (
                      <img src={ord.pet_image} alt={ord.pet_title} className="w-14 h-14 rounded-xl object-cover" />
                    )}
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-extrabold text-[#231F20]">{ord.pet_title}</span>
                        <span className="text-xs font-mono text-[#65605B]">({ord.id})</span>
                      </div>
                      <p className="text-xs text-[#4A4344] mt-0.5">
                        Buyer: <strong>{ord.buyer_name}</strong> ({ord.buyer_email}) • Total Paid: <strong>${ord.total_amount}</strong>
                      </p>
                      <p className="text-[11px] text-[#65605B] mt-0.5">
                        Deliver To: {ord.shipping_address} • Tracking Code: <span className="font-mono font-bold">{ord.tracking_code}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <label className="text-[11px] font-bold text-[#65605B]">Status:</label>
                    <select
                      value={ord.tracking_status}
                      onChange={(e) => handleUpdateOrderStatus(ord.id, e.target.value)}
                      className="px-3 py-2 bg-white border border-[#E6DCCF] rounded-xl text-xs font-extrabold text-[#231F20]"
                    >
                      <option value="Order Placed">Order Placed</option>
                      <option value="Health Check Completed">Health Check Completed</option>
                      <option value="In Transit">In Transit</option>
                      <option value="Out for Delivery">Out for Delivery</option>
                      <option value="Delivered">Delivered</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. Upload New Pet Listing Form */}
      {activeTab === 'upload' && (
        <div className="bg-white rounded-3xl border border-[#EFE9DF] p-8 shadow-aesthetic max-w-3xl mx-auto">
          <h3 className="text-xl font-bold text-[#231F20] font-display mb-1">Upload & Post New Pet Listing</h3>
          <p className="text-xs text-[#65605B] mb-6">
            Listing will be published under your verified seller profile: <strong>{currentUser.name}</strong> ({currentUser.id}).
          </p>

          <form onSubmit={handleUploadPet} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#4A4344] mb-1">Pet Title / Headline</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Purebred Persian Kitten"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#FAF6F0] border border-[#E6DCCF] rounded-xl text-xs focus:outline-none focus:border-[#E07A5F]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4A4344] mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#FAF6F0] border border-[#E6DCCF] rounded-xl text-xs font-bold"
                >
                  <option value="Dogs">Dogs & Puppies</option>
                  <option value="Cats">Cats & Kittens</option>
                  <option value="Fishes">Aquatic Fishes</option>
                  <option value="Rabbits">Rabbits & Bunnies</option>
                  <option value="Birds">Exotic Birds</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#4A4344] mb-1">Price ($ USD)</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 350"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#FAF6F0] border border-[#E6DCCF] rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#4A4344] mb-1">Age</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 3 Months"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#FAF6F0] border border-[#E6DCCF] rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#4A4344] mb-1">Breed Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Golden Retriever"
                  value={breed}
                  onChange={(e) => setBreed(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#FAF6F0] border border-[#E6DCCF] rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#4A4344] mb-1">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#FAF6F0] border border-[#E6DCCF] rounded-xl text-xs font-bold"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Pair">Pair</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#4A4344] mb-1">Stock Count (Units)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#FAF6F0] border border-[#E6DCCF] rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#4A4344] mb-1">Health Certificate Status</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vaccinated, Microchipped"
                  value={healthStatus}
                  onChange={(e) => setHealthStatus(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#FAF6F0] border border-[#E6DCCF] rounded-xl text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#4A4344] mb-1">Image URL</label>
              <input
                type="url"
                placeholder="https://images.unsplash.com/photo-..."
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#FAF6F0] border border-[#E6DCCF] rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#4A4344] mb-1">Detailed Description</label>
              <textarea
                rows="3"
                required
                placeholder="Provide temperament, diet, and training history..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#FAF6F0] border border-[#E6DCCF] rounded-xl text-xs"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-[#E07A5F] via-[#F4A261] to-[#E76F51] hover:from-[#D96B43] text-white font-extrabold text-sm rounded-xl shadow-lg shadow-[#E07A5F]/25 transition-all"
            >
              Publish Listing to Marketplace
            </button>
          </form>
        </div>
      )}

      {/* 4. Payout Payment Setup */}
      {activeTab === 'payouts' && (
        <div className="bg-white rounded-3xl border border-[#EFE9DF] p-8 shadow-aesthetic max-w-2xl mx-auto space-y-6">
          <div>
            <h3 className="text-xl font-bold text-[#231F20] font-display">Seller Payment & Payout Configurations</h3>
            <p className="text-xs text-[#65605B] mt-1">
              Private payout settings for <strong>{currentUser.name}</strong>. These details are never shown on public listings.
            </p>
          </div>

          <form onSubmit={handleSavePayouts} className="space-y-4">
            <div className="p-4 bg-[#FFF5F0] rounded-2xl border border-[#F4C4B7] space-y-3">
              <span className="text-xs font-bold text-[#E07A5F] block">UPI Payout Setup</span>
              <div>
                <label className="block text-[11px] font-semibold text-[#4A4344] mb-1">Your UPI ID (for instant settlement)</label>
                <input
                  type="text"
                  required
                  placeholder="kennel@upi"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#F4C4B7] rounded-xl text-xs font-semibold"
                />
              </div>
            </div>

            <div className="p-4 bg-[#FAF6F0] rounded-2xl border border-[#E6DCCF] space-y-3">
              <span className="text-xs font-bold text-[#231F20] block">NetBanking & Direct Bank Payout Setup</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#4A4344] mb-1">Bank Name</label>
                  <input
                    type="text"
                    placeholder="HDFC Bank"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#E6DCCF] rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#4A4344] mb-1">Account Number</label>
                  <input
                    type="text"
                    placeholder="987654321012"
                    value={bankAccount}
                    onChange={(e) => setBankAccount(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#E6DCCF] rounded-xl text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#4A4344] mb-1">IFSC Code</label>
                <input
                  type="text"
                  placeholder="HDFC0001234"
                  value={ifscCode}
                  onChange={(e) => setIfscCode(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#E6DCCF] rounded-xl text-xs"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-[#231F20] hover:bg-[#E07A5F] text-white font-bold text-xs rounded-xl shadow transition-all"
            >
              Save Payment Payout Details
            </button>
          </form>
        </div>
      )}

      {/* Edit Listing Modal */}
      {editingPet && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#231F20]/50 backdrop-blur-sm animate-fadeIn"
        >
          <div className="bg-white rounded-3xl shadow-aesthetic border border-[#EFE9DF] max-w-lg w-full overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-[#231F20] p-5 text-white flex items-center justify-between">
              <h3 className="text-base font-bold font-display">Edit Listing: {editingPet.title}</h3>
              <button onClick={() => setEditingPet(null)} className="text-white/70 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditPet} className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#4A4344] mb-1">Title</label>
                  <input
                    type="text"
                    required
                    value={editingPet.title}
                    onChange={(e) => setEditingPet({ ...editingPet, title: e.target.value })}
                    className="w-full px-3 py-2 bg-[#FAF6F0] border border-[#E6DCCF] rounded-xl text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#4A4344] mb-1">Category</label>
                  <select
                    value={editingPet.category}
                    onChange={(e) => setEditingPet({ ...editingPet, category: e.target.value })}
                    className="w-full px-3 py-2 bg-[#FAF6F0] border border-[#E6DCCF] rounded-xl text-xs font-bold"
                  >
                    <option value="Dogs">Dogs</option>
                    <option value="Cats">Cats</option>
                    <option value="Fishes">Fishes</option>
                    <option value="Rabbits">Rabbits</option>
                    <option value="Birds">Birds</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#4A4344] mb-1">Price ($)</label>
                  <input
                    type="number"
                    required
                    value={editingPet.price}
                    onChange={(e) => setEditingPet({ ...editingPet, price: e.target.value })}
                    className="w-full px-3 py-2 bg-[#FAF6F0] border border-[#E6DCCF] rounded-xl text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#4A4344] mb-1">Stock</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editingPet.stock}
                    onChange={(e) => setEditingPet({ ...editingPet, stock: e.target.value })}
                    className="w-full px-3 py-2 bg-[#FAF6F0] border border-[#E6DCCF] rounded-xl text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#4A4344] mb-1">Age</label>
                  <input
                    type="text"
                    required
                    value={editingPet.age}
                    onChange={(e) => setEditingPet({ ...editingPet, age: e.target.value })}
                    className="w-full px-3 py-2 bg-[#FAF6F0] border border-[#E6DCCF] rounded-xl text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#4A4344] mb-1">Breed</label>
                  <input
                    type="text"
                    required
                    value={editingPet.breed}
                    onChange={(e) => setEditingPet({ ...editingPet, breed: e.target.value })}
                    className="w-full px-3 py-2 bg-[#FAF6F0] border border-[#E6DCCF] rounded-xl text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#4A4344] mb-1">Health Status</label>
                  <input
                    type="text"
                    required
                    value={editingPet.health_status}
                    onChange={(e) => setEditingPet({ ...editingPet, health_status: e.target.value })}
                    className="w-full px-3 py-2 bg-[#FAF6F0] border border-[#E6DCCF] rounded-xl text-xs font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4A4344] mb-1">Description</label>
                <textarea
                  rows="3"
                  required
                  value={editingPet.description}
                  onChange={(e) => setEditingPet({ ...editingPet, description: e.target.value })}
                  className="w-full px-3 py-2 bg-[#FAF6F0] border border-[#E6DCCF] rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingPet(null)}
                  className="px-4 py-2 bg-[#FAF6F0] text-[#4A4344] rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#E07A5F] hover:bg-[#D0654A] text-white rounded-xl text-xs font-extrabold flex items-center space-x-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
