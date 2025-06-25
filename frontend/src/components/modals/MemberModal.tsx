import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../utils/AppContext';
import CloseButton from '../ui/CloseButton';

interface MemberModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MemberModal: React.FC<MemberModalProps> = ({ isOpen, onClose }) => {
  const { addTeamMember, teamMembers } = useAppContext();
  const [memberName, setMemberName] = useState('');

  // Reset form when modal is opened
  useEffect(() => {
    if (isOpen) {
      setMemberName('');
    }
  }, [isOpen]);

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedName = memberName.trim();
    if (trimmedName && !teamMembers.includes(trimmedName)) {
      addTeamMember(trimmedName);
      onClose();
    } else if (teamMembers.includes(trimmedName)) {
      alert('This member already exists in the team.');
    }
  };

  // Close modal when clicking outside
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 sm:p-0"
      onClick={handleBackdropClick}
    >
      <div className="w-full max-w-sm sm:max-w-md mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden w-full">
          <div className="px-4 py-3 sm:px-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-white">Add Team Member</h3>
            <CloseButton onClick={onClose} />
          </div>
          <div className="p-4 sm:p-6">
            <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">Member Name</label>
              <input 
                type="text" 
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
                className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" 
                required
              />
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end space-y-2 space-y-reverse sm:space-y-0 sm:space-x-3 mt-4">
              <button 
                type="button" 
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-gray-800 dark:hover:text-white transition w-full sm:w-auto"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition w-full sm:w-auto mb-2 sm:mb-0"
              >
                Add Member
              </button>
            </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemberModal;
