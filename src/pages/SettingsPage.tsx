import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Download, Upload, RotateCcw, Eraser } from 'lucide-react';
import { blankData, downloadBackup, parseData, readBackup, useStore } from '../data/store';
import { storageUsedMb } from '../data/images';
import { sampleData } from '../data/sampleData';
import { Card, PageHeader } from '../components/ui';
import { useCloud } from '../cloud/CloudProvider';
import { DateInput, TextInput } from '../components/forms';

export function SettingsPage() {
  const cloud = useCloud();
  const { data, updateProject, replaceAll, notify } = useStore();
  const [name, setName] = useState(data.project.name);
  const [address, setAddress] = useState(data.project.address);
  const [moveIn, setMoveIn] = useState(data.project.targetMoveIn);
  const [importError, setImportError] = useState('');
  const [busy, setBusy] = useState<'export' | 'import' | null>(null);
  const [usedMb, setUsedMb] = useState<number | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const photoCount = data.photos.filter((p) => p.hasImage).length;

  useEffect(() => {
    storageUsedMb().then(setUsedMb).catch(() => {});
  }, [data.photos]);

  const onExport = async () => {
    setBusy('export');
    try {
      await downloadBackup(data);
      notify('Backup downloaded');
    } catch {
      window.alert('The backup could not be created. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  const saveProject = () => {
    updateProject({ name: name.trim() || 'Grand Dunman Home', address: address.trim(), targetMoveIn: moveIn || data.project.targetMoveIn });
    notify('Home details saved');
  };

  const onImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImportError('');
    setBusy('import');
    try {
      const text = await file.text();
      parseData(JSON.parse(text)); // check it's a real backup before asking
      if (!window.confirm('Replace everything in the app with this backup? Your current data will be overwritten.')) return;
      const imported = await readBackup(text);
      replaceAll(imported);
      setName(imported.project.name);
      setAddress(imported.project.address);
      setMoveIn(imported.project.targetMoveIn);
      notify('Backup imported');
    } catch (err) {
      setImportError(err instanceof SyntaxError ? 'This file is not a valid backup.' : (err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const reset = () => {
    if (!window.confirm('Replace everything with the original sample data? Your own changes and photos will be lost. (Tip: export a backup first.)')) return;
    replaceAll(sampleData);
    setName(sampleData.project.name);
    setAddress(sampleData.project.address);
    setMoveIn(sampleData.project.targetMoveIn);
    notify('Sample data restored');
  };

  const startFresh = () => {
    if (!window.confirm('Start fresh? This keeps your room list and budget categories, but clears all measurements, payments, designs, photos (including your own) and tasks, and sets room progress and budgets to zero.')) return;
    replaceAll(blankData(data));
    notify('Ready for your own data');
  };

  return (
    <>
      <PageHeader eyebrow="Your data" title="Settings & Backup" subtitle={cloud.home ? `Saved on this device and synced online with “${cloud.home.name}”.` : 'Everything you enter is saved automatically on this device, in this browser.'} />
      {cloud.home && (
        <p className="banner-info">
          You're syncing online: <strong>Import backup</strong>, <strong>Start fresh</strong> and <strong>Reset</strong> also change the shared home for everyone in it.
        </p>
      )}

      <div className="grid-2">
        <Card title="Home details">
          <form className="form-stack" onSubmit={(e) => { e.preventDefault(); saveProject(); }}>
            <TextInput label="Home name" value={name} onChange={setName} />
            <TextInput label="Address" value={address} onChange={setAddress} />
            <DateInput label="Target move-in date" value={moveIn} onChange={setMoveIn} />
            <div>
              <button type="submit" className="btn btn-primary">Save details</button>
            </div>
          </form>
        </Card>

        <Card title="Backup">
          <p className="card-text">
            Your data lives only on this device. Your phone and computer each keep their own copy.
            Export a backup now and then, and keep it somewhere safe, like email or cloud storage.
            The backup includes your photos.
          </p>
          <p className="card-text">
            <strong>{photoCount}</strong> photo{photoCount === 1 ? '' : 's'} saved
            {usedMb !== null && <> · about <strong>{usedMb < 1 ? '<1' : Math.round(usedMb)} MB</strong> used on this device</>}
          </p>
          <div className="button-stack">
            <button className="btn btn-ghost" onClick={onExport} disabled={busy !== null}>
              <Download size={16} /> {busy === 'export' ? 'Preparing…' : 'Export backup'}
            </button>
            <button className="btn btn-ghost" onClick={() => fileInput.current?.click()} disabled={busy !== null}>
              <Upload size={16} /> {busy === 'import' ? 'Importing…' : 'Import backup'}
            </button>
            <input ref={fileInput} type="file" accept=".json,application/json" hidden onChange={onImport} />
          </div>
          {importError && <p className="field-msg">{importError}</p>}
          <p className="card-text muted">Tip: to move your data to another device, export here and import it there.</p>
        </Card>

        <Card title="Start over">
          <p className="card-text">Ready to enter your real details? "Start fresh" clears the example content but keeps your rooms and budget categories.</p>
          <div className="button-stack">
            <button className="btn btn-ghost" onClick={startFresh}>
              <Eraser size={16} /> Start fresh
            </button>
            <button className="btn btn-danger" onClick={reset}>
              <RotateCcw size={16} /> Reset to sample data
            </button>
          </div>
        </Card>
      </div>
    </>
  );
}
