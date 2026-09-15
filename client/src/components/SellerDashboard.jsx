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
  AlertCircle,
  Sparkles,
  TrendingUp
} from 'lucide-react';

/**
 * SellerDashboard Component
 * Allows sellers to upload new pet products with pricing, age, health info, and stock counts.
 * Manages inventory stock updates, auto-unlisting when sold out, and payment payout settings.
 */
export default function SellerDashboard({ currentUser }) {
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory', 'upload', 'payouts'

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

  // Payout Settings state
  const [upiId, setUpiId] = useState(currentUser?.upi_id || 'pawstails@upi');
  const [bankName, setBankName] = useState(currentUser?.bank_name || 'HDFC Bank');
  const [bankAccount, setBankAccount] = useState(currentUser?.bank_account || '987654321012');
  const [ifscCode, setIfscCode] = useState(currentUser?.ifsc_code || 'HDFC0001234');
  
  const [editingPet, setEditingPet] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchSellerPets();
  }, [currentUser]);

  const fetchSellerPets = async () => {
    setLoading(true);
    try {
      const sellerId = currentUser?.id || 'u-seller-1';
      const res = await fetch(`/api/pets?sellerId=${sellerId}`);
      const data = await res.json();
      if (data.success) {
        setPets(data.pets);
      }
    } catch (err) {
      console.error("Error loading seller pets:", err);
    } finally {
      setLoading(false);
    }
  };

  // Submit new pet post
  const handleUploadPet = async (e) => {
    e.preventDefault();
    setMessage('');

    try {
      const res = await fetch('/api/pets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seller_id: currentUser?.id || 'u-seller-1',
          seller_name: currentUser?.name || 'Paws & Tails Haven',
          title,
          category,
          price: Number(price),
          age,
          breed,
          gender,
          health_status: healthStatus,
          description,
          image_url: imageUrl || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=800&q=80',
          stock: Number(stock)
        })
      });

      const data = await res.json();
      if (data.success) {
        setMessage('Pet listed successfully on marketplace!');
        // Reset form
        setTitle('');
        setPrice('');
        setAge('');
        setBreed('');
        setDescription('');
        setImageUrl('');
        fetchSellerPets();
        setActiveTab('inventory');
      }
    } catch (err) {
      setMessage('Failed to upload pet post.');
    }
  };

  // Update existing stock / pet details
  const handleUpdateStock = async (petId, newStock) => {
    try {
      const res = await fetch(`/api/pets/${petId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock: Number(newStock) })
      });
      const data = await res.json();
      if (data.success) {
        fetchSellerPets();
      }
    } catch (err) {
      alert("Failed to update stock");
    }
  };

  // Delete listing
  const handleDeletePet = async (petId) => {
    if (!window.confirm("Are you sure you want to delete this pet listing?")) return;
    try {
      const res = await fetch(`/api/pets/${petId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchSellerPets();
      }
    } catch (err) {
      alert("Failed to delete listing.");
    }
  };

  // Save Payout Configurations
  const handleSavePayouts = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/update-payout', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser?.id || 'u-seller-1',
          upi_id: upiId,
          bank_name: bankName,
          bank_account: bankAccount,
          ifsc_code: ifscCode
        })
      });
      const data = await res.json();
      if (data.success) {
        setMessage('Payout & Payment settings updated successfully!');
      }
    } catch (err) {
      setMessage('Failed to update payout settings.');
    }
  };

  // Calculate statistics
  const totalListings = pets.length;
  const activeStock = pets.reduce((acc, p) => acc + (p.stock || 0), 0);
  const totalValue = pets.reduce((acc, p) => acc + (p.price * p.stock), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      
      {/* Header & Stats Cards */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-3xl font-black text-slate-900 font-display">Seller Management Portal</h1>
            <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 text-xs font-bold rounded-full">
              Seller Account
            </span>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            Post pets, manage stock inventory, and configure payout accounts (UPI / NetBanking)
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'inventory' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            My Inventory ({totalListings})
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 ${
              activeTab === 'upload' ? 'bg-orange-500 text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Post New Pet</span>
          </button>
          <button
            onClick={() => setActiveTab('payouts')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'payouts' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Payment Payouts
          </button>
        </div>
      </div>

      {/* Analytics Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center text-xl font-bold">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Listings</span>
            <h3 className="text-2xl font-black text-slate-900 font-display">{totalListings} Posts</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-xl font-bold">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Units in Stock</span>
            <h3 className="text-2xl font-black text-slate-900 font-display">{activeStock} Units</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center text-xl font-bold">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Estimated Inventory Value</span>
            <h3 className="text-2xl font-black text-slate-900 font-display">${totalValue}</h3>
          </div>
        </div>
      </div>

      {message && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl flex items-center">
          <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600" />
          <span>{message}</span>
        </div>
      )}

      {/* 1. Inventory Stock List */}
      {activeTab === 'inventory' && (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 font-display">Listed Pet Stock</h3>
              <p className="text-xs text-slate-500">
                Stock decrements automatically when buyers purchase. Unlists automatically when stock hits 0.
              </p>
            </div>
            <button
              onClick={() => setActiveTab('upload')}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl shadow"
            >
              + Add New Pet Listing
            </button>
          </div>

          {pets.length === 0 ? (
            <div className="p-12 text-center text-slate-500">No pet posts listed yet. Click "Post New Pet" to get started!</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4">Pet Item</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Price</th>
                    <th className="px-6 py-4">Current Stock</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {pets.map((pet) => (
                    <tr key={pet.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 flex items-center space-x-3">
                        <img src={pet.image_url} alt={pet.title} className="w-12 h-12 rounded-xl object-cover" />
                        <div>
                          <p className="font-bold text-slate-900">{pet.title}</p>
                          <p className="text-[11px] text-slate-400">Breed: {pet.breed} • Age: {pet.age}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-700">{pet.category}</td>
                      <td className="px-6 py-4 font-black text-slate-900">${pet.price}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            min="0"
                            value={pet.stock}
                            onChange={(e) => handleUpdateStock(pet.id, e.target.value)}
                            className="w-16 px-2 py-1 bg-slate-100 border border-slate-200 rounded-lg text-center font-bold text-xs"
                          />
                          <span className="text-[10px] text-slate-400">units</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {pet.stock > 0 ? (
                          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded-full">
                            Active Listing
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-red-100 text-red-800 text-[10px] font-extrabold rounded-full">
                            Sold Out (Unlisted)
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          onClick={() => handleDeletePet(pet.id)}
                          className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                          title="Delete Listing"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 2. Upload New Pet Listing Form */}
      {activeTab === 'upload' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm max-w-3xl mx-auto">
          <h3 className="text-xl font-bold text-slate-900 font-display mb-2">Upload & Post New Pet Item</h3>
          <p className="text-xs text-slate-500 mb-6">
            Provide details including age, price, health background, photo, and available stock units.
          </p>

          <form onSubmit={handleUploadPet} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Pet Title / Post Headline</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Purebred Persian Kitten"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
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
                <label className="block text-xs font-bold text-slate-700 mb-1">Price ($ USD)</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 350"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Age</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 3 Months"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Breed Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Golden Retriever"
                  value={breed}
                  onChange={(e) => setBreed(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Stock Count (Units)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Health Certificate & Vaccination Status</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vaccinated, Microchipped, Vet Certified"
                  value={healthStatus}
                  onChange={(e) => setHealthStatus(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Image URL</label>
              <input
                type="url"
                placeholder="https://images.unsplash.com/photo-..."
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Detailed Description</label>
              <textarea
                rows="3"
                required
                placeholder="Provide temperament, diet, and training history..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-orange-500/25 transition-all"
            >
              Publish Post Directly to Marketplace
            </button>
          </form>
        </div>
      )}

      {/* 3. Payout Payment Setup */}
      {activeTab === 'payouts' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm max-w-2xl mx-auto space-y-6">
          <div>
            <h3 className="text-xl font-bold text-slate-900 font-display">Seller Payment & Payout Configurations</h3>
            <p className="text-xs text-slate-500 mt-1">
              Specify your UPI ID or NetBanking account details where customer payments will be deposited upon order completion.
            </p>
          </div>

          <form onSubmit={handleSavePayouts} className="space-y-4">
            <div className="p-4 bg-orange-50/60 rounded-2xl border border-orange-200 space-y-3">
              <span className="text-xs font-bold text-orange-900 block">UPI Payout Setup</span>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Your UPI ID (for instant settlement)</label>
                <input
                  type="text"
                  required
                  placeholder="pawstails@upi"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-orange-200 rounded-xl text-xs font-semibold"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <span className="text-xs font-bold text-slate-900 block">NetBanking & Direct Bank Payout Setup</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Bank Name</label>
                  <input
                    type="text"
                    placeholder="HDFC Bank"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Account Number</label>
                  <input
                    type="text"
                    placeholder="987654321012"
                    value={bankAccount}
                    onChange={(e) => setBankAccount(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">IFSC Code</label>
                <input
                  type="text"
                  placeholder="HDFC0001234"
                  value={ifscCode}
                  onChange={(e) => setIfscCode(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow transition-all"
            >
              Save Payment Payout Details
            </button>
          </form>
        </div>
      )}

    </div>
  );
}
