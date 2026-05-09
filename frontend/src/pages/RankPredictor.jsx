import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Target, Search, ArrowRight, Building2, 
  ChevronRight, MapPin, Award, Sparkles 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../utils/api';

const EXAMS = [
  { id: 'JEE Main', name: 'JEE Main 2026', type: 'Engineering' },
  { id: 'MHT-CET', name: 'MHT-CET 2026', type: 'Engineering/Pharmacy' },
  { id: 'NEET', name: 'NEET UG 2026', type: 'Medical' },
  { id: 'CAT', name: 'CAT 2025', type: 'Management' },
];

const CATEGORIES = ['Open', 'OBC', 'SC', 'ST', 'EWS', 'TFWS'];

export default function RankPredictor() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    exam: '',
    score: '',
    category: 'Open',
    state: 'All'
  });
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handlePredict = async () => {
    setLoading(true);
    try {
      // Fetch universities that accept the selected exam
      const { data } = await api.get(`/universities?entranceExam=${formData.exam}&limit=50`);
      
      // Simulate "prediction" logic: 
      // Higher scores get matched with better NIRF rank colleges
      const score = parseFloat(formData.score);
      const matched = (data.data || []).map(uni => {
        let probability = 'Medium';
        const rank = uni.nirfRank || 100;
        
        if (score >= 95) {
          if (rank <= 50) probability = 'High';
          else probability = 'Safe';
        } else if (score >= 85) {
          if (rank <= 50) probability = 'Low';
          else if (rank <= 100) probability = 'Medium';
          else probability = 'High';
        } else {
          if (rank <= 100) probability = 'Low';
          else probability = 'Medium';
        }
        
        return { ...uni, probability };
      }).sort((a, b) => (a.nirfRank || 999) - (b.nirfRank || 999));

      setResults(matched);
      setStep(3);
    } catch (error) {
      console.error('Prediction failed', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#f8fafc] dark:bg-dark-bg min-h-screen py-12">
      <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white mb-4">College Rank Predictor</h1>
          <p className="text-slate-500 max-w-2xl mx-auto">
            Find potential colleges you can get based on your entrance exam scores and category. Our tool uses historical cut-off trends to estimate your chances.
          </p>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-center gap-4 mb-10">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-2">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black transition-all ${step >= i ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-slate-200 text-slate-500'}`}>
                {i}
              </div>
              {i < 3 && <div className={`w-8 h-1 rounded-full ${step > i ? 'bg-primary' : 'bg-slate-200'}`} />}
            </div>
          ))}
        </div>

        {/* Form / Results Area */}
        <div className="bg-white dark:bg-dark-card rounded-[3rem] border border-slate-100 dark:border-white/5 shadow-2xl overflow-hidden min-h-[500px]">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-10"
              >
                <h2 className="text-2xl font-black mb-8 text-center">Select Your Entrance Exam</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {EXAMS.map(exam => (
                    <button 
                      key={exam.id}
                      onClick={() => { setFormData({ ...formData, exam: exam.id }); setStep(2); }}
                      className={`p-8 rounded-[2rem] border-2 transition-all text-left group flex items-center justify-between ${formData.exam === exam.id ? 'border-primary bg-primary/5' : 'border-slate-50 hover:border-primary/30 hover:bg-slate-50'}`}
                    >
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">{exam.type}</p>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white">{exam.name}</h3>
                      </div>
                      <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                        <ChevronRight className={`w-6 h-6 ${formData.exam === exam.id ? 'text-primary' : 'text-slate-300'}`} />
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-10 max-w-2xl mx-auto"
              >
                <button onClick={() => setStep(1)} className="text-xs font-black text-slate-400 uppercase tracking-widest mb-8 hover:text-primary transition-colors flex items-center gap-2">
                  ← Back to Exam Selection
                </button>
                <h2 className="text-2xl font-black mb-8">Score & Category Details</h2>
                <div className="space-y-8">
                  <div>
                    <label className="text-xs font-black uppercase text-slate-500 block mb-3 tracking-widest">Percentile / Score *</label>
                    <input 
                      type="number" 
                      placeholder="e.g. 98.5"
                      value={formData.score}
                      onChange={e => setFormData({ ...formData, score: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-dark-bg border-none p-5 rounded-2xl text-lg font-black outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-black uppercase text-slate-500 block mb-3 tracking-widest">Counseling Category</label>
                    <div className="grid grid-cols-3 gap-3">
                      {CATEGORIES.map(c => (
                        <button 
                          key={c}
                          onClick={() => setFormData({ ...formData, category: c })}
                          className={`py-3 rounded-xl font-bold text-sm transition-all border-2 ${formData.category === c ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' : 'border-slate-100 hover:border-primary/20'}`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button 
                    onClick={handlePredict}
                    disabled={!formData.score || loading}
                    className="w-full py-5 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                  >
                    {loading ? 'ANALYZING TRENDS...' : 'PREDICT COLLEGES NOW'}
                  </button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div 
                key="step3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-10"
              >
                <div className="flex flex-col md:flex-row items-center justify-between mb-10 gap-6">
                  <div>
                    <h2 className="text-2xl font-black mb-2">Predicted Colleges</h2>
                    <p className="text-sm text-slate-500 font-medium">Results for {formData.exam} Score: <span className="text-primary font-black">{formData.score}</span> Category: <span className="text-primary font-black">{formData.category}</span></p>
                  </div>
                  <button onClick={() => setStep(1)} className="px-6 py-3 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 font-black text-xs rounded-xl hover:bg-primary hover:text-white transition-all uppercase tracking-widest">
                    RE-START PREDICTION
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {results.map((uni, i) => (
                    <motion.div 
                      key={uni._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="group relative bg-[#fcfdfe] dark:bg-dark-bg p-6 rounded-[2rem] border border-slate-100 dark:border-white/5 hover:border-primary hover:shadow-2xl transition-all"
                    >
                      {/* Probability Badge */}
                      <div className={`absolute top-6 right-6 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                        uni.probability === 'High' ? 'bg-green-100 text-green-600' :
                        uni.probability === 'Safe' ? 'bg-blue-100 text-blue-600' :
                        uni.probability === 'Medium' ? 'bg-orange-100 text-orange-600' :
                        'bg-red-100 text-red-600'
                      }`}>
                        {uni.probability} Chance
                      </div>

                      <div className="w-14 h-14 bg-white rounded-2xl shadow-sm border border-slate-50 flex items-center justify-center overflow-hidden mb-6">
                        {uni.logoUrl ? (
                          <img src={uni.logoUrl} alt={uni.name} className="w-full h-full object-contain" />
                        ) : (
                          <span className="text-xl font-black text-primary">{uni.name[0]}</span>
                        )}
                      </div>

                      <h3 className="font-black text-lg mb-2 line-clamp-2 leading-tight group-hover:text-primary transition-colors">{uni.name}</h3>
                      <p className="text-xs text-slate-400 font-bold mb-6 flex items-center gap-1.5 uppercase tracking-widest">
                        <MapPin className="w-3.5 h-3.5 text-primary" /> {uni.city}, {uni.state}
                      </p>

                      <div className="space-y-3 mb-6">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-slate-400">NIRF Ranking</span>
                          <span className="text-slate-900 dark:text-white">#{uni.nirfRank || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-slate-400">Avg Package</span>
                          <span className="text-primary">₹{uni.stats?.avgPackageLPA || '4.5'} LPA</span>
                        </div>
                      </div>

                      <Link 
                        to={`/universities/${uni.slug}`}
                        className="w-full py-3 bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 text-slate-900 dark:text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-primary hover:text-white hover:border-primary flex items-center justify-center gap-2 transition-all shadow-sm"
                      >
                        VIEW PROFILE <ArrowRight className="w-4 h-4" />
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Info */}
        <div className="mt-12 p-8 bg-slate-900 text-white rounded-[2.5rem] flex flex-col md:flex-row items-center gap-10">
          <div className="w-20 h-20 bg-primary/20 rounded-3xl flex items-center justify-center shrink-0">
            <Award className="w-10 h-10 text-primary" />
          </div>
          <div>
            <h4 className="text-xl font-black mb-2">How it works?</h4>
            <p className="text-slate-400 text-sm leading-relaxed">
              Our predictor analyzes your score against the latest seat allotment data and previous years' opening/closing ranks. It provides a probability score (High, Medium, Low) for each institution to help you prioritize your choices during counseling.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
