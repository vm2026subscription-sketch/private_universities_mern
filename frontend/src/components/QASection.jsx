import React, { useState, useEffect } from 'react';
import { MessageSquare, ThumbsUp, Send, User, ChevronRight, HelpCircle, Loader2 } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

export default function QASection({ universityId, user }) {
  const [questions, setQuestions] = useState([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [votingAnswerId, setVotingAnswerId] = useState(null);

  useEffect(() => {
    fetchQuestions();
  }, [universityId]);

  const fetchQuestions = async () => {
    try {
      const res = await api.get(`/questions?universityId=${universityId}`);
      setQuestions(res.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleHelpfulVote = async (questionId, answerId) => {
    if (!user) return toast.error('Please login to mark answer as helpful');
    if (votingAnswerId) return;

    setVotingAnswerId(answerId);
    try {
      const res = await api.put(`/questions/${questionId}/answers/${answerId}/upvote`);
      if (res.data?.success) {
        toast.success(res.data.voted ? 'Marked as helpful!' : 'Helpful vote removed');
        setQuestions((prevQuestions) =>
          prevQuestions.map((q) => (q._id === questionId ? (res.data.data || q) : q))
        );
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit vote');
    } finally {
      setVotingAnswerId(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return toast.error('Please login to ask a question');
    if (!newQuestion.trim()) return;

    setLoading(true);
    try {
      await api.post('/questions', {
        universityId,
        title: newQuestion.substring(0, 50),
        content: newQuestion
      });
      setNewQuestion('');
      toast.success('Question posted!');
      fetchQuestions();
    } catch (err) {
      toast.error('Failed to post question');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
         <h2 className="text-xl font-bold mb-2">Student Q&A</h2>
         <p className="text-sm text-light-muted">Ask questions and get answers from students and alumni.</p>
      </div>

      {/* Ask Question Form */}
      <form onSubmit={handleSubmit} className="relative">
         <textarea 
           value={newQuestion}
           onChange={(e) => setNewQuestion(e.target.value)}
           placeholder="What would you like to know about this university?"
           className="input-field !pr-16 min-h-[100px] py-4"
         />
         <button 
           type="submit"
           disabled={loading}
           className="absolute right-3 bottom-3 w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 hover:scale-110 transition-transform disabled:opacity-50"
         >
            <Send className="w-5 h-5" />
         </button>
      </form>

      <div className="space-y-6">
         {questions.map((q, i) => (
           <div key={q._id} className="card p-6 border-l-4 border-primary">
              <div className="flex items-start gap-4 mb-4">
                 <div className="w-10 h-10 rounded-full bg-light-bg dark:bg-dark-border flex items-center justify-center text-link">
                    <User className="w-5 h-5" />
                 </div>
                 <div className="flex-1">
                    <p className="font-bold text-sm mb-1">{q.title || q.content}</p>
                    <p className="text-[10px] text-light-muted uppercase font-bold tracking-widest flex items-center gap-2">
                       Asked by {q.userId?.name || 'Anonymous'} | {new Date(q.createdAt).toLocaleDateString()}
                    </p>
                 </div>
              </div>

              {/* Answers */}
              <div className="pl-4 sm:pl-14 space-y-4">
                 {(q.answers || []).map((ans) => {
                   const upvotesArr = ans.upvotes || [];
                   const helpfulCount = upvotesArr.length;
                   const isVoted = user && upvotesArr.some((uId) => (uId._id || uId).toString() === user._id.toString());
                   const isVoting = votingAnswerId === ans._id;

                   return (
                     <div key={ans._id || ans.content} className="p-4 bg-light-bg dark:bg-dark-border/50 rounded-2xl relative">
                        <p className="text-sm">{ans.content}</p>
                        <div className="flex items-center justify-between mt-3">
                           <span className="text-[10px] font-bold text-light-muted italic">Answered by {ans.userId?.name || 'Student'}</span>
                           <button
                             type="button"
                             onClick={() => handleHelpfulVote(q._id, ans._id)}
                             disabled={isVoting}
                             className={`flex items-center gap-1 text-[10px] font-bold uppercase transition-colors ${
                               isVoted ? 'text-emerald-600 dark:text-emerald-400 font-extrabold' : 'text-link hover:opacity-80'
                             } disabled:opacity-50`}
                           >
                             {isVoting ? (
                               <Loader2 className="w-3 h-3 animate-spin" />
                             ) : (
                               <ThumbsUp className={`w-3 h-3 ${isVoted ? 'fill-current' : ''}`} />
                             )}
                             <span>Helpful {helpfulCount > 0 ? `(${helpfulCount})` : ''}</span>
                           </button>
                        </div>
                     </div>
                   );
                 })}
                 
                 {q.answers?.length === 0 && (
                   <div className="p-4 border border-dashed border-light-border dark:border-dark-border rounded-2xl text-center">
                      <p className="text-xs text-light-muted italic">No answers yet. Be the first to help!</p>
                   </div>
                 )}
              </div>
           </div>
         ))}

         {questions.length === 0 && (
           <div className="text-center py-12">
              <HelpCircle className="w-12 h-12 text-light-muted mx-auto mb-4 opacity-20" />
              <p className="text-sm text-light-muted italic">No questions asked yet. Have something on your mind?</p>
           </div>
         )}
      </div>
    </div>
  );
}
