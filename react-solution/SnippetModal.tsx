import React, { useState } from 'react';
import { useCommStore } from './store';

interface SnippetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSnippet: (parsedText: string) => void;
}

export const SnippetModal: React.FC<SnippetModalProps> = ({ isOpen, onClose, onSelectSnippet }) => {
  const { activeLead, folders, snippets, addFolder, addSnippet } = useCommStore();
  const [newFolderName, setNewFolderName] = useState('');
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  
  const [isCreatingSnippet, setIsCreatingSnippet] = useState(false);
  const [newSnippetTitle, setNewSnippetTitle] = useState('');
  const [newSnippetContent, setNewSnippetContent] = useState('');

  if (!isOpen) return null;

  const handleAddFolder = () => {
    if (newFolderName.trim()) {
      addFolder(newFolderName.trim());
      setNewFolderName('');
    }
  };

  const handleCreateSnippet = () => {
    if (activeFolderId && newSnippetContent.trim() && newSnippetTitle.trim()) {
      addSnippet(activeFolderId, newSnippetTitle, newSnippetContent);
      setIsCreatingSnippet(false);
      setNewSnippetTitle('');
      setNewSnippetContent('');
    }
  };

  // HARD REQUIREMENT: Regex implementation for Liquid Tags (Dynamic Variables)
  const parseLiquidTags = (template: string) => {
    if (!activeLead) return template;
    
    // Safely fallback strings to ensure regex replace doesn't insert undefined
    const fName = activeLead.first_name || '';
    const lName = activeLead.last_name || '';
    const fullName = \`\${fName} \${lName}\`.trim();
    const solicitor = activeLead.solicitor_name || 'your solicitor';

    return template
      .replace(/{{first_name}}/g, fName)
      .replace(/{{last_name}}/g, lName)
      .replace(/{{full_name}}/g, fullName)
      .replace(/{{solicitor}}/g, solicitor);
  };

  const handleSelect = (rawContent: string) => {
    // Dynamically inject values before emitting up to input component
    const parsedLine = parseLiquidTags(rawContent);
    onSelectSnippet(parsedLine);
    onClose();
  };

  const folderSnippets = snippets.filter(s => s.folderId === activeFolderId);

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-[700px] h-[550px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in-up">
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50/50">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Snippet & Macro Library</h2>
            <p className="text-xs text-gray-500 mt-1">Select a template to inject dynamic liquid variables automatically.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-800 hover:bg-gray-200 p-2 rounded-full transition-colors">&times;</button>
        </div>
        
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar: Folder Management */}
          <div className="w-[240px] border-r border-gray-100 bg-gray-50/50 p-4 flex flex-col gap-4 overflow-y-auto">
            <div className="flex flex-col gap-1.5">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">My Folders</h3>
              {folders.map(f => (
                <button 
                  key={f.id} 
                  onClick={() => { setActiveFolderId(f.id); setIsCreatingSnippet(false); }}
                  className={\`text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all \${activeFolderId === f.id ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-white text-gray-700 hover:shadow-sm border border-transparent'}\`}
                >
                  📁 {f.name}
                </button>
              ))}
            </div>
            {/* Add New Folder Input */}
            <div className="mt-auto flex flex-col gap-2 pt-4 border-t border-gray-200">
              <input 
                type="text" 
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="New folder name..."
                className="text-sm px-3 py-2 border border-gray-200 rounded-lg w-full outline-none focus:border-blue-500"
              />
              <button 
                onClick={handleAddFolder} 
                disabled={!newFolderName.trim()}
                className="bg-gray-800 text-white font-medium text-sm py-2 rounded-lg hover:bg-gray-900 disabled:opacity-40 transition-colors"
              >
                + Create Folder
              </button>
            </div>
          </div>

          {/* Main Content Area: Snippets List / Creator */}
          <div className="flex-1 p-5 overflow-y-auto bg-white flex flex-col">
            {!activeFolderId ? (
              <div className="m-auto text-gray-400 text-sm flex flex-col items-center gap-3">
                <svg className="w-12 h-12 text-gray-300" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M2 5a2 2 0 012-2h4a1 1 0 01.658.24l2.5 2.115V5a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm42 0a1 1 0 011-1h4.512a1 1 0 01.658.24l2.5 2.115V5A1 1 0 0116 5v10a1 1 0 01-1 1H5a1 1 0 01-1-1V5z" clipRule="evenodd" /></svg>
                Select a folder to manage your snippets.
              </div>
            ) : isCreatingSnippet ? (
              <div className="flex flex-col gap-4 h-full animate-fade-in">
                <h3 className="font-bold text-gray-800 border-b pb-2">Draft New Snippet</h3>
                <input 
                  type="text" 
                  placeholder="Internal Title (e.g., 'Initial Follow-Up')" 
                  value={newSnippetTitle}
                  onChange={(e) => setNewSnippetTitle(e.target.value)}
                  className="p-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-500 bg-gray-50 focus:bg-white transition-all shadow-inner"
                />
                <textarea 
                  placeholder="Snippet Text. Supports: {{first_name}}, {{last_name}}, {{solicitor}}" 
                  value={newSnippetContent}
                  onChange={(e) => setNewSnippetContent(e.target.value)}
                  className="p-3 border border-gray-200 rounded-xl text-sm flex-1 resize-none outline-none focus:border-blue-500 bg-gray-50 focus:bg-white transition-all shadow-inner"
                />
                <div className="flex gap-3 justify-end mt-2 pt-4 border-t border-gray-100">
                  <button onClick={() => setIsCreatingSnippet(false)} className="text-sm px-4 py-2 font-medium text-gray-500 hover:text-gray-800 rounded-lg hover:bg-gray-100">Cancel</button>
                  <button 
                    onClick={handleCreateSnippet} 
                    disabled={!newSnippetTitle || !newSnippetContent}
                    className="text-sm px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 shadow flex items-center gap-2 disabled:opacity-50"
                  >
                    Save Snippet
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-800 text-base">Available Templates</h3>
                  <button 
                    onClick={() => setIsCreatingSnippet(true)}
                    className="text-xs font-semibold bg-blue-50 text-blue-700 px-3 py-1.5 rounded-md hover:bg-blue-100 transition-colors border border-blue-200"
                  >
                    + Create New
                  </button>
                </div>
                {folderSnippets.length === 0 && (
                   <div className="text-sm text-gray-400 text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                     No snippets configured in this folder yet.
                   </div>
                )}
                <div className="grid grid-cols-1 gap-3">
                  {folderSnippets.map(s => (
                    <div 
                      key={s.id} 
                      onClick={() => handleSelect(s.content)} 
                      className="p-4 border border-gray-200 rounded-xl hover:border-blue-400 hover:shadow-md cursor-pointer transition-all group bg-white relative overflow-hidden"
                    >
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-transparent group-hover:bg-blue-500 transition-colors"></div>
                      <strong className="block text-sm text-gray-900 group-hover:text-blue-700 mb-1">{s.title}</strong>
                      <p className="text-xs text-gray-500 truncate leading-relaxed">{s.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
