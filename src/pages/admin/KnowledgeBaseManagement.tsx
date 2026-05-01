import React, { useEffect, useState } from 'react';
import { supabase } from '../../config/supabaseClient';
import { Spinner } from '../../components/Spinner';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Search,
  Plus,
  Trash2,
  Edit,
  Database,
  Filter,
  Users,
  Shield,
  FileText,
  MessageCircle
} from 'lucide-react';

export default function KnowledgeBaseManagement() {
  const [knowledge, setKnowledge] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    fetchKnowledgeBase();
  }, []);

  const fetchKnowledgeBase = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('knowledge_base')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setKnowledge(data || []);
    } catch (error) {
      console.error('Error fetching knowledge base:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'policy': return <Shield className="w-4 h-4" />;
      case 'grading': return <FileText className="w-4 h-4" />;
      case 'system_guide': return <Database className="w-4 h-4" />;
      case 'faq': return <MessageCircle className="w-4 h-4" />;
      default: return <BookOpen className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'policy': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800';
      case 'grading': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800';
      case 'system_guide': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800';
      case 'faq': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700';
    }
  };

  const filteredKnowledge = knowledge.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Spinner size="large" />
      </div>
    );
  }

  return (
    <motion.div 
      className="space-y-6 p-4 lg:p-8 max-w-7xl mx-auto"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 flex items-center gap-3">
            <Database className="w-8 h-8 text-blue-500" />
            AI Knowledge Base
          </h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400 max-w-2xl">
            Manage the knowledge base that powers your RAG (Retrieval-Augmented Generation) AI Assistant. 
            The system uses vector search to retrieve these policies and guides when answering user questions.
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-md transition-colors whitespace-nowrap font-medium">
          <Plus className="w-5 h-5" />
          Add Knowledge
        </button>
      </motion.div>

      {/* Stats */}
      <motion.div variants={containerVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Entries', value: knowledge.length, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
          { label: 'Policies', value: knowledge.filter(k => k.category === 'policy').length, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
          { label: 'System Guides', value: knowledge.filter(k => k.category === 'system_guide').length, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
          { label: 'FAQs', value: knowledge.filter(k => k.category === 'faq').length, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20' }
        ].map((stat, idx) => (
          <motion.div key={idx} variants={itemVariants} className={`p-4 rounded-xl border border-gray-100 dark:border-gray-800 ${stat.bg}`}>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{stat.label}</p>
            <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Filters & Search */}
      <motion.div variants={itemVariants} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search knowledge base by title or content..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
          />
        </div>
        <div className="relative min-w-[180px]">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none font-medium text-gray-700 dark:text-gray-300"
          >
            <option value="all">All Categories</option>
            <option value="policy">Policies & Rules</option>
            <option value="grading">Grading</option>
            <option value="system_guide">System Guides</option>
            <option value="faq">FAQ</option>
          </select>
        </div>
      </motion.div>

      {/* Knowledge Base Grid */}
      <motion.div variants={containerVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredKnowledge.length === 0 ? (
          <div className="col-span-full py-12 text-center bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
            <BookOpen className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">No entries found</h3>
            <p className="text-gray-500 dark:text-gray-400">Try adjusting your search or category filter.</p>
          </div>
        ) : (
          filteredKnowledge.map((item) => {
            const audiences = item.metadata?.audience || [];
            
            return (
              <motion.div 
                key={item.id} 
                variants={itemVariants}
                whileHover={{ y: -4, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)" }}
                className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col h-full transition-all"
              >
                <div className="flex justify-between items-start mb-4">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${getCategoryColor(item.category)}`}>
                    {getCategoryIcon(item.category)}
                    {item.category.toUpperCase().replace('_', ' ')}
                  </span>
                  <div className="flex gap-2">
                    <button className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-md transition-colors">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 line-clamp-1">
                  {item.title}
                </h3>
                
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 flex-1 line-clamp-4">
                  {item.content}
                </p>

                <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Target Audience:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {audiences.map((aud, i) => (
                      <span key={i} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded-md">
                        {aud.charAt(0).toUpperCase() + aud.slice(1)}
                      </span>
                    ))}
                    {audiences.length === 0 && (
                      <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-400 text-xs rounded-md">Everyone</span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </motion.div>
    </motion.div>
  );
}
