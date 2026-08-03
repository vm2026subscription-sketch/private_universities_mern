import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  BookOpen, Plus, Edit3, Trash2, Search, Filter, CheckCircle2,
  DollarSign, Clock, GraduationCap, X
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';


export default function UniversityCoursesSection() {
  const context = useOutletContext();
  const uni = context?.uni;
  const refreshUni = context?.refreshUni;

    // Starts empty and fills from the API. Seeding this with sample rows meant a
  // university opened its dashboard to somebody else's courses, photos and
  // recruiters, and a failed request left that fiction on screen looking real.
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterDegree, setFilterDegree] = useState('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const fetchCourses = async () => {
    try {
      const { data } = await api.get('/university-portal/my-university/courses');
      if (data?.success && data?.data) {
        const formatted = data.data.map((c) => ({
          id: c._id,
          _id: c._id,
          name: c.name || c.baseCourse || 'Course',
          degree: c.degree || (c.category === 'UG' ? 'Undergraduate' : c.category === 'PG' ? 'Postgraduate' : 'Diploma'),
          duration: c.duration ? `${c.duration} Years` : '4 Years',
          fee: c.feesPerYear ? `₹${c.feesPerYear} / yr` : '₹1,00,000 / yr',
          seats: c.totalSeats || 60,
          eligibility: c.eligibility || '10+2 with 60% aggregate'
        }));
        if (formatted.length > 0) setCourses(formatted);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, [uni]);

  // Form State
  const [formData, setFormData] = useState({
    name: '', degree: 'Undergraduate', duration: '4 Years', fee: '', seats: '', eligibility: ''
  });

  const handleOpenAdd = () => {
    setEditingCourse(null);
    setFormData({ name: '', degree: 'Undergraduate', duration: '4 Years', fee: '', seats: '', eligibility: '' });
    setModalOpen(true);
  };

  const handleOpenEdit = (course) => {
    setEditingCourse(course);
    setFormData({
      name: course.name,
      degree: course.degree,
      duration: course.duration,
      fee: course.fee,
      seats: course.seats,
      eligibility: course.eligibility
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.fee) {
      toast.error('Please enter course name and annual fee!');
      return;
    }

    try {
      if (editingCourse?._id || (typeof editingCourse?.id === 'string' && editingCourse?.id?.length > 10)) {
        const targetId = editingCourse._id || editingCourse.id;
        const { data } = await api.put(`/university-portal/my-university/courses/${targetId}`, formData);
        if (data?.success) {
          toast.success('Course updated successfully!');
        }
      } else {
        const { data } = await api.post('/university-portal/my-university/courses', formData);
        if (data?.success) {
          toast.success('New course added successfully!');
        }
      }
      setModalOpen(false);
      fetchCourses();
      if (refreshUni) refreshUni();
    } catch (error) {
      console.error('Error saving course:', error);
      toast.error(error.response?.data?.message || 'Failed to save course');
    }
  };

  const handleDelete = async (id) => {
    try {
      if (typeof id === 'string' && id.length > 10) {
        await api.delete(`/university-portal/my-university/courses/${id}`);
      }
      setCourses(prev => prev.filter(c => c.id !== id));
      setDeleteConfirmId(null);
      toast.success('Course deleted');
      if (refreshUni) refreshUni();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete course');
    }
  };

  const filteredCourses = courses.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase());
    const matchesDegree = filterDegree === 'All' || c.degree === filterDegree;
    return matchesSearch && matchesDegree;
  });

  return (
    <div className="space-y-8">
      {/* Header & Action Bar */}
      <div className="p-6 rounded-3xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-light-text dark:text-dark-text flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-primary" /> Offerings & Course Catalog
          </h2>
          <p className="text-xs text-light-muted dark:text-dark-muted mt-1">
            Manage your academic programs, fee structure, seat intake, and entry criteria.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="px-5 py-3 rounded-xl bg-primary text-white font-bold text-xs hover:bg-primary/90 transition-all shadow-md shadow-primary/20 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add New Course
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-light-muted dark:text-dark-muted absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search courses by title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {['All', 'Undergraduate', 'Postgraduate', 'Diploma/PhD'].map(degree => (
            <button
              key={degree}
              onClick={() => setFilterDegree(degree)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                filterDegree === degree
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-white dark:bg-dark-card text-light-muted dark:text-dark-muted border border-light-border dark:border-dark-border hover:text-light-text dark:hover:text-dark-text'
              }`}
            >
              {degree}
            </button>
          ))}
        </div>
      </div>

      {/* Courses List Table / Cards */}
      <div className="rounded-3xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-light-bg/60 dark:bg-dark-bg/60 border-b border-light-border dark:border-dark-border text-light-muted dark:text-dark-muted font-bold uppercase tracking-wider">
              <tr>
                <th className="p-4 pl-6">Course Name & Level</th>
                <th className="p-4">Duration</th>
                <th className="p-4">Annual Fee</th>
                <th className="p-4">Intake Seats</th>
                <th className="p-4">Eligibility Criteria</th>
                <th className="p-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-light-border dark:divide-dark-border font-medium text-light-text dark:text-dark-text">
              {filteredCourses.map((c) => (
                <tr key={c.id} className="hover:bg-light-bg/50 dark:hover:bg-dark-bg/30 transition-colors">
                  <td className="p-4 pl-6">
                    <p className="font-bold text-sm text-light-text dark:text-dark-text">{c.name}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
                      {c.degree}
                    </span>
                  </td>
                  <td className="p-4 text-light-muted dark:text-dark-muted">
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-primary" /> {c.duration}</span>
                  </td>
                  <td className="p-4 font-bold text-emerald-600 dark:text-emerald-400">
                    {c.fee}
                  </td>
                  <td className="p-4 font-semibold">
                    {c.seats} seats
                  </td>
                  <td className="p-4 max-w-xs text-light-muted dark:text-dark-muted truncate">
                    {c.eligibility}
                  </td>
                  <td className="p-4 pr-6 text-right space-x-2">
                    <button
                      onClick={() => handleOpenEdit(c)}
                      className="p-2 rounded-xl border border-light-border dark:border-dark-border hover:bg-primary hover:text-white transition-colors"
                      title="Edit Course"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(c.id)}
                      className="p-2 rounded-xl border border-light-border dark:border-dark-border text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                      title="Delete Course"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="max-w-lg w-full p-6 rounded-3xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-light-border dark:border-dark-border pb-3">
              <h3 className="font-bold text-base text-light-text dark:text-dark-text">
                {editingCourse ? 'Edit Course Details' : 'Add New Course'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="p-1 rounded-lg text-light-muted hover:text-light-text">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-light-muted dark:text-dark-muted mb-1">
                  Course Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. B.Tech Artificial Intelligence"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-light-muted dark:text-dark-muted mb-1">
                    Degree Level
                  </label>
                  <select
                    value={formData.degree}
                    onChange={(e) => setFormData(prev => ({ ...prev, degree: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg text-xs font-medium"
                  >
                    <option value="Undergraduate">Undergraduate</option>
                    <option value="Postgraduate">Postgraduate</option>
                    <option value="Diploma/PhD">Diploma/PhD</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-light-muted dark:text-dark-muted mb-1">
                    Duration
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 4 Years"
                    value={formData.duration}
                    onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg text-xs font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-light-muted dark:text-dark-muted mb-1">
                    Annual Fee
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ₹2,40,000 / yr"
                    value={formData.fee}
                    onChange={(e) => setFormData(prev => ({ ...prev, fee: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-light-muted dark:text-dark-muted mb-1">
                    Total Seats
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 120"
                    value={formData.seats}
                    onChange={(e) => setFormData(prev => ({ ...prev, seats: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg text-xs font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-light-muted dark:text-dark-muted mb-1">
                  Eligibility Criteria
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. 10+2 with 60% aggregate in Physics, Chemistry, Math"
                  value={formData.eligibility}
                  onChange={(e) => setFormData(prev => ({ ...prev, eligibility: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg text-xs font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-light-border dark:border-dark-border">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-light-border dark:border-dark-border text-xs font-bold text-light-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 shadow-md shadow-primary/20"
                >
                  Save Course
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="max-w-md w-full p-6 rounded-3xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border shadow-2xl space-y-4">
            <h3 className="font-bold text-lg text-light-text dark:text-dark-text">Delete Course?</h3>
            <p className="text-xs text-light-muted dark:text-dark-muted">
              Are you sure you want to remove this course from your catalog?
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2.5 rounded-xl border border-light-border dark:border-dark-border text-xs font-bold text-light-muted"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-2.5 rounded-xl bg-red-500 text-white text-xs font-bold hover:bg-red-600"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
