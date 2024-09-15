import { useEffect, useState } from "react";
import { EphemeriStorageClient } from "./EphemeriStorageClient/EphemeriStorageClient";

function App() {
  const [client, setClient] = useState<EphemeriStorageClient | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      const client = new EphemeriStorageClient({ verbose: true });
      setClient(client);
    })();
  }, []);
  return (
    <div>
      <h1>ephemeri-storage test</h1>
      <div>
        <h3>Upload file</h3>
        <input type="text" placeholder="Content" id="message" name="message" />
        <button
          onClick={async () => {
            if (client) {
              const message = (
                document.getElementById("message") as HTMLInputElement
              ).value;
              const buf = new TextEncoder().encode(message);
              const downloadUrl0 = await client.upload(buf, "test.txt");
              setDownloadUrl(downloadUrl0);
            }
          }}
        >
          Upload
        </button>
      </div>
      <div>
        <h3>Download file</h3>
        <a href={downloadUrl || "#"} target="_blank" rel="noreferrer">
          {downloadUrl}
        </a>
      </div>
    </div>
  );
}

export default App;
