import React, { useEffect, useState } from 'react';
import { Users, Shield, RefreshCw, UserCheck } from 'lucide-react';
import { api } from '../services/api';

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await api.getUsers();
        setUsers(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  return (
    <div className="space-y-6 pb-16 max-w-5xl mx-auto">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700 border border-blue-200">
              <Users className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700">Identity Directory</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">Platform accounts, role permissions, and user experience modes</p>
        </div>
      </div>

      <div className="card-soft p-6 bg-white">
        {loading ? (
          <div className="py-8 text-center text-xs text-slate-400">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-pastel-lavender-main" />
            <span>Loading user accounts...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase font-semibold">
                  <th className="pb-3">Name</th>
                  <th className="pb-3">Email</th>
                  <th className="pb-3">Role</th>
                  <th className="pb-3">Mode</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 font-semibold text-slate-900">{u.full_name}</td>
                    <td className="py-3.5 text-slate-600 font-mono text-[11px]">{u.email}</td>
                    <td className="py-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        u.role === 'ADMIN' ? 'bg-slate-900 text-white border-slate-900' :
                        u.role === 'SOC_ANALYST' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                        'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3.5">
                      <span className="text-slate-600 font-medium">{u.user_mode}</span>
                    </td>
                    <td className="py-3.5">
                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        <span>Active</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
