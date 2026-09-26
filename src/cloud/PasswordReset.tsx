import { useState } from 'react';
import { EditorModal } from '../components/forms';
import { friendlyError, useCloud } from './CloudProvider';
import { useStore } from '../data/store';

/** Shown after opening a "reset password" email link. */
export function PasswordReset() {
  const { recovering, setNewPassword } = useCloud();
  const { notify } = useStore();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [dismissed, setDismissed] = useState(false);
  if (!recovering || dismissed) return null;

  const save = async () => {
    if (password.length < 8) return setError('At least 8 characters, please.');
    try {
      await setNewPassword(password);
      notify('New password saved');
    } catch (e) {
      setError(friendlyError(e));
    }
  };

  return (
    <EditorModal title="Choose a new password" onClose={() => setDismissed(true)} onSave={save} saveLabel="Save password">
      <div className="field">
        <label htmlFor="new-password">New password</label>
        <input id="new-password" className="input" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <p className="field-hint">At least 8 characters.</p>
      </div>
      {error && <p className="field-msg">{error}</p>}
    </EditorModal>
  );
}
