import { useState } from 'react';

interface AlertOptions {
  title?: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  onConfirm?: () => void;
  showCancel?: boolean;
}

export function useAlert() {
  const [alert, setAlert] = useState<AlertOptions | null>(null);

  const showAlert = (options: AlertOptions) => {
    setAlert(options);
  };

  const hideAlert = () => {
    setAlert(null);
  };

  const confirm = (message: string, onConfirm: () => void) => {
    showAlert({
      title: 'Confirm',
      message,
      type: 'warning',
      onConfirm,
      showCancel: true,
    });
  };

  const AlertComponent = alert ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background rounded-lg shadow-lg max-w-md w-full mx-4 p-6">
        <div className="mb-4">
          {alert.title && (
            <h3 className="text-lg font-semibold mb-2">{alert.title}</h3>
          )}
          <p className="text-sm text-muted-foreground">{alert.message}</p>
        </div>
        <div className="flex justify-end gap-2">
          {alert.showCancel && (
            <button
              onClick={hideAlert}
              className="px-4 py-2 border rounded-md hover:bg-muted"
            >
              Cancel
            </button>
          )}
          <button
            onClick={() => {
              alert.onConfirm?.();
              hideAlert();
            }}
            className={`px-4 py-2 rounded-md text-white ${
              alert.type === 'error' ? 'bg-red-500 hover:bg-red-600' :
              alert.type === 'warning' ? 'bg-yellow-500 hover:bg-yellow-600' :
              alert.type === 'success' ? 'bg-green-500 hover:bg-green-600' :
              'bg-blue-500 hover:bg-blue-600'
            }`}
          >
            {alert.onConfirm ? 'Confirm' : 'OK'}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { showAlert, hideAlert, confirm, AlertComponent };
}
