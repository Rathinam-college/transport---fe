import React, { useState, useEffect } from 'react';
import api from '../services/api';

const CategoryManagement = () => {
  const [institutions, setInstitutions] = useState([]);
  const [budgetHeads, setBudgetHeads] = useState([]);
  const [subBudgetHeads, setSubBudgetHeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // We need to keep track of changes before saving
  const [bhMappings, setBhMappings] = useState({});
  const [sbhMappings, setSbhMappings] = useState({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const [instRes, bhRes, sbhRes] = await Promise.all([
        api.get('institutions/'),
        api.get('budget-heads/'),
        api.get('sub-budget-heads/')
      ]);
      setInstitutions(instRes.data);
      setBudgetHeads(bhRes.data);
      setSubBudgetHeads(sbhRes.data);

      // Initialize mappings state
      const initialBh = {};
      bhRes.data.forEach(bh => {
        initialBh[bh.id] = bh.institutions || [];
      });
      setBhMappings(initialBh);

      const initialSbh = {};
      sbhRes.data.forEach(sbh => {
        initialSbh[sbh.id] = sbh.institutions || [];
      });
      setSbhMappings(initialSbh);
      
    } catch (error) {
      console.error("Error fetching data", error);
      setMessage('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleBhMapping = (bhId, instId) => {
    setBhMappings(prev => {
      const current = prev[bhId] || [];
      const updated = current.includes(instId) 
        ? current.filter(id => id !== instId)
        : [...current, instId];
      return { ...prev, [bhId]: updated };
    });
  };

  const toggleSbhMapping = (sbhId, instId) => {
    setSbhMappings(prev => {
      const current = prev[sbhId] || [];
      const updated = current.includes(instId) 
        ? current.filter(id => id !== instId)
        : [...current, instId];
      return { ...prev, [sbhId]: updated };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      // Create an array of promises for all updates
      const promises = [];

      // Update Budget Heads
      for (const bh of budgetHeads) {
        if (JSON.stringify(bh.institutions) !== JSON.stringify(bhMappings[bh.id])) {
          promises.push(api.patch(`budget-heads/${bh.id}/`, { institutions: bhMappings[bh.id] }));
        }
      }

      // Update Sub Budget Heads
      for (const sbh of subBudgetHeads) {
        if (JSON.stringify(sbh.institutions) !== JSON.stringify(sbhMappings[sbh.id])) {
          promises.push(api.patch(`sub-budget-heads/${sbh.id}/`, { institutions: sbhMappings[sbh.id] }));
        }
      }

      await Promise.all(promises);
      setMessage('Mappings successfully updated!');
      
      // Refresh to get clean state
      await fetchData();
      
    } catch (error) {
      console.error("Error saving mappings", error);
      setMessage('Failed to save mappings. Please check console for details.');
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(''), 5000); // Clear message after 5s
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-400">Loading categories...</div>;
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-4 md:p-8 animate-fade-in pb-20">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 mb-2">Category Management</h1>
          <p className="text-slate-400">Assign budget heads and sub-budget heads to specific institutions.</p>
        </div>
        <button 
          onClick={handleSave} 
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-lg mb-6 text-sm font-medium ${message.includes('Failed') ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-green-500/10 text-green-400 border border-green-500/20'}`}>
          {message}
        </div>
      )}

      <div className="space-y-6">
        {budgetHeads.map(bh => (
          <div key={bh.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            {/* Budget Head Header */}
            <div className="bg-slate-800/80 p-4 flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-700/50 gap-4">
              <div className="flex items-center gap-3">
                <div 
                  className="w-4 h-4 rounded-full shadow-sm" 
                  style={{ backgroundColor: bh.color_code || '#cbd5e1' }}
                  title="Color Code"
                ></div>
                <h2 className="text-lg font-bold text-slate-200">{bh.name}</h2>
              </div>
              
              <div className="flex flex-wrap gap-4 items-center bg-slate-900 p-2 rounded-lg border border-slate-700/50">
                <span className="text-xs text-slate-400 uppercase font-semibold tracking-wider mr-2">Assign To:</span>
                {institutions.map(inst => (
                  <label key={inst.id} className="flex items-center gap-2 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500/50 cursor-pointer"
                      checked={(bhMappings[bh.id] || []).includes(inst.id)}
                      onChange={() => toggleBhMapping(bh.id, inst.id)}
                    />
                    <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">{inst.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Sub Budget Heads */}
            <div className="p-4 bg-slate-900/50 divide-y divide-slate-800/50">
              {subBudgetHeads.filter(sbh => sbh.budget_head === bh.id).length === 0 ? (
                <p className="text-slate-500 text-sm italic py-2">No sub-categories defined.</p>
              ) : (
                subBudgetHeads
                  .filter(sbh => sbh.budget_head === bh.id)
                  .map(sbh => (
                    <div key={sbh.id} className="py-3 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-slate-800/20 px-2 rounded-lg transition-colors">
                      <span className="text-slate-300 ml-7">{sbh.name}</span>
                      
                      <div className="flex flex-wrap gap-4 items-center">
                        {institutions.map(inst => (
                          <label key={inst.id} className="flex items-center gap-2 cursor-pointer group">
                            <input 
                              type="checkbox" 
                              className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-900 text-blue-400 focus:ring-blue-500/50 cursor-pointer"
                              checked={(sbhMappings[sbh.id] || []).includes(inst.id)}
                              onChange={() => toggleSbhMapping(sbh.id, inst.id)}
                            />
                            <span className="text-xs text-slate-400 group-hover:text-slate-200 transition-colors">{inst.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CategoryManagement;
