import { useState } from 'react';
import { Building2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

const SchemeSwitcher = () => {
  const { userProfile, updateActiveScheme } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // Don't render if user doesn't have multiple schemes
  if (!userProfile?.schemeIds || userProfile.schemeIds.length <= 1) {
    return null;
  }

  const handleSchemeChange = async (e) => {
    const newSchemeId = e.target.value;

    // Don't do anything if selecting the same scheme
    if (newSchemeId === userProfile.activeSchemeId) {
      return;
    }

    setIsLoading(true);
    try {
      await updateActiveScheme(newSchemeId);

      // Get the scheme name for the toast message
      const schemeName = userProfile.schemeNames?.[newSchemeId] || newSchemeId;
      toast.success(`Switched to ${schemeName}`);

      // Reload the page to fetch data for the new scheme
      window.location.reload();
    } catch (error) {
      console.error('Failed to switch scheme:', error);
      toast.error('Failed to switch scheme');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Building2 className="w-5 h-5 text-gray-500" />
      <select
        value={userProfile.activeSchemeId || ''}
        onChange={handleSchemeChange}
        disabled={isLoading}
        className="select select-sm select-bordered bg-white border-gray-300 text-sm min-w-[200px]"
      >
        {userProfile.schemeIds.map(schemeId => (
          <option key={schemeId} value={schemeId}>
            {userProfile.schemeNames?.[schemeId] || schemeId}
          </option>
        ))}
      </select>
    </div>
  );
};

export default SchemeSwitcher;
