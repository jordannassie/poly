"use client";

import { useState, useEffect } from "react";

export default function StorageDebugPage() {
  const [results, setResults] = useState<{
    supabaseUrl: string | null;
    testObjectUrl: string | null;
    restUrl: string | null;
    imgLoadStatus: "pending" | "success" | "error";
    imgErrorMessage: string | null;
    fetchObjectStatus: "pending" | "success" | "error";
    fetchObjectCode: number | null;
    fetchObjectError: string | null;
    fetchRestStatus: "pending" | "success" | "error";
    fetchRestCode: number | null;
    fetchRestError: string | null;
    serverHealthData: Record<string, unknown> | null;
    serverHealthError: string | null;
  }>({
    supabaseUrl: null,
    testObjectUrl: null,
    restUrl: null,
    imgLoadStatus: "pending",
    imgErrorMessage: null,
    fetchObjectStatus: "pending",
    fetchObjectCode: null,
    fetchObjectError: null,
    fetchRestStatus: "pending",
    fetchRestCode: null,
    fetchRestError: null,
    serverHealthData: null,
    serverHealthError: null,
  });

  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || null;
    const testObjectUrl = supabaseUrl
      ? `${supabaseUrl}/storage/v1/object/public/SPORTS/logos/images-1.png`
      : null;
    const restUrl = supabaseUrl ? `${supabaseUrl}/rest/v1/` : null;

    setResults((prev) => ({
      ...prev,
      supabaseUrl,
      testObjectUrl,
      restUrl,
    }));

    // Test 1: Fetch the storage object
    if (testObjectUrl) {
      fetch(testObjectUrl, { method: "HEAD", mode: "cors" })
        .then((res) => {
          setResults((prev) => ({
            ...prev,
            fetchObjectStatus: res.ok ? "success" : "error",
            fetchObjectCode: res.status,
            fetchObjectError: res.ok ? null : `HTTP ${res.status} ${res.statusText}`,
          }));
        })
        .catch((err) => {
          setResults((prev) => ({
            ...prev,
            fetchObjectStatus: "error",
            fetchObjectError: err.message || "Unknown fetch error",
          }));
        });
    }

    // Test 2: Fetch the REST API endpoint (reachability test)
    if (restUrl) {
      fetch(restUrl, { method: "HEAD", mode: "cors" })
        .then((res) => {
          setResults((prev) => ({
            ...prev,
            fetchRestStatus: res.ok || res.status === 400 ? "success" : "error",
            fetchRestCode: res.status,
            fetchRestError: null,
          }));
        })
        .catch((err) => {
          setResults((prev) => ({
            ...prev,
            fetchRestStatus: "error",
            fetchRestError: err.message || "Unknown fetch error",
          }));
        });
    }

    // Test 3: Fetch server-side health check
    fetch("/api/health/storage")
      .then((res) => res.json())
      .then((data) => {
        setResults((prev) => ({
          ...prev,
          serverHealthData: data,
        }));
      })
      .catch((err) => {
        setResults((prev) => ({
          ...prev,
          serverHealthError: err.message || "Failed to fetch server health",
        }));
      });
  }, []);

  const handleImageLoad = () => {
    setResults((prev) => ({
      ...prev,
      imgLoadStatus: "success",
      imgErrorMessage: null,
    }));
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setResults((prev) => ({
      ...prev,
      imgLoadStatus: "error",
      imgErrorMessage: `Image failed to load. Check console for details.`,
    }));
    console.error("[StorageDebug] Image load error:", e);
  };

  const StatusBadge = ({ status }: { status: "pending" | "success" | "error" }) => {
    const colors = {
      pending: "bg-yellow-500",
      success: "bg-green-500",
      error: "bg-red-500",
    };
    return (
      <span className={`inline-block w-3 h-3 rounded-full ${colors[status]} mr-2`} />
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">🔍 Storage Debug Page</h1>
        <p className="text-gray-400 mb-8">Diagnosing Supabase Storage connectivity</p>

        {/* Section 1: Environment Variables */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">1. Environment Variables</h2>
          <div className="font-mono text-sm space-y-2">
            <div>
              <span className="text-gray-400">NEXT_PUBLIC_SUPABASE_URL: </span>
              <span className={results.supabaseUrl ? "text-green-400" : "text-red-400"}>
                {results.supabaseUrl || "NOT SET"}
              </span>
            </div>
          </div>
        </div>

        {/* Section 2: Test URLs */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">2. Test URLs</h2>
          <div className="font-mono text-sm space-y-2 break-all">
            <div>
              <span className="text-gray-400">Storage Object URL: </span>
              <span className="text-blue-400">{results.testObjectUrl || "N/A"}</span>
            </div>
            <div>
              <span className="text-gray-400">REST API URL: </span>
              <span className="text-blue-400">{results.restUrl || "N/A"}</span>
            </div>
          </div>
        </div>

        {/* Section 3: Direct Image Test */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">3. Direct Image Test</h2>
          <div className="flex items-start gap-6">
            <div className="w-24 h-24 bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden">
              {results.testObjectUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={results.testObjectUrl}
                  alt="Test image"
                  className="w-full h-full object-contain"
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                  crossOrigin="anonymous"
                />
              ) : (
                <span className="text-gray-500 text-xs">No URL</span>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center mb-2">
                <StatusBadge status={results.imgLoadStatus} />
                <span className="font-semibold">
                  {results.imgLoadStatus === "pending" && "Loading..."}
                  {results.imgLoadStatus === "success" && "Image loaded successfully!"}
                  {results.imgLoadStatus === "error" && "Image failed to load"}
                </span>
              </div>
              {results.imgErrorMessage && (
                <p className="text-red-400 text-sm">{results.imgErrorMessage}</p>
              )}
            </div>
          </div>
        </div>

        {/* Section 4: Browser Fetch Tests */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">4. Browser Fetch Tests</h2>
          
          <div className="space-y-4">
            {/* Storage Object Fetch */}
            <div>
              <div className="flex items-center mb-1">
                <StatusBadge status={results.fetchObjectStatus} />
                <span className="font-semibold">Storage Object Fetch (HEAD)</span>
              </div>
              <div className="ml-5 text-sm font-mono">
                {results.fetchObjectCode !== null && (
                  <div>
                    <span className="text-gray-400">Status: </span>
                    <span className={results.fetchObjectCode === 200 ? "text-green-400" : "text-yellow-400"}>
                      {results.fetchObjectCode}
                    </span>
                  </div>
                )}
                {results.fetchObjectError && (
                  <div className="text-red-400">{results.fetchObjectError}</div>
                )}
              </div>
            </div>

            {/* REST API Fetch */}
            <div>
              <div className="flex items-center mb-1">
                <StatusBadge status={results.fetchRestStatus} />
                <span className="font-semibold">REST API Reachability (HEAD)</span>
              </div>
              <div className="ml-5 text-sm font-mono">
                {results.fetchRestCode !== null && (
                  <div>
                    <span className="text-gray-400">Status: </span>
                    <span className={results.fetchRestCode < 500 ? "text-green-400" : "text-yellow-400"}>
                      {results.fetchRestCode}
                    </span>
                    <span className="text-gray-500 ml-2">
                      (400 is normal - means server is reachable)
                    </span>
                  </div>
                )}
                {results.fetchRestError && (
                  <div className="text-red-400">{results.fetchRestError}</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Section 5: Server-Side Health Check */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">5. Server-Side Health Check</h2>
          {results.serverHealthError ? (
            <div className="text-red-400">{results.serverHealthError}</div>
          ) : results.serverHealthData ? (
            <pre className="font-mono text-sm bg-gray-900 p-4 rounded overflow-x-auto">
              {JSON.stringify(results.serverHealthData, null, 2)}
            </pre>
          ) : (
            <div className="text-gray-400">Loading server health data...</div>
          )}
        </div>

        {/* Section 6: Diagnosis */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">6. Diagnosis</h2>
          <div className="space-y-2 text-sm">
            {!results.supabaseUrl && (
              <div className="text-red-400">
                ❌ NEXT_PUBLIC_SUPABASE_URL is not set - env var missing
              </div>
            )}
            {results.fetchRestStatus === "error" && results.fetchRestError?.includes("Failed to fetch") && (
              <div className="text-red-400">
                ❌ DNS/Network unreachable - wrong project ref or network issue
              </div>
            )}
            {results.fetchObjectStatus === "error" && results.fetchObjectCode === 404 && (
              <div className="text-yellow-400">
                ⚠️ Object not found (404) - file may not exist at this path
              </div>
            )}
            {results.fetchObjectStatus === "error" && results.fetchObjectCode === 403 && (
              <div className="text-yellow-400">
                ⚠️ Access denied (403) - bucket may not be public
              </div>
            )}
            {results.fetchObjectStatus === "success" && results.imgLoadStatus === "error" && (
              <div className="text-yellow-400">
                ⚠️ Fetch works but image fails - possible CSP or CORS issue
              </div>
            )}
            {results.fetchObjectStatus === "success" && results.imgLoadStatus === "success" && (
              <div className="text-green-400">
                ✅ Storage is working correctly from browser!
              </div>
            )}
            {results.serverHealthData && (
              <>
                {results.serverHealthData.ok_server && !results.serverHealthData.ok_public && (
                  <div className="text-yellow-400">
                    ⚠️ Server can reach storage but client cannot - check NEXT_PUBLIC_ prefix
                  </div>
                )}
                {!results.serverHealthData.ok_server && (
                  <div className="text-red-400">
                    ❌ Server cannot reach storage - check SUPABASE_URL env var
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 p-4 border border-gray-700 rounded-lg">
          <h3 className="font-semibold mb-2">📋 Next Steps</h3>
          <ol className="list-decimal list-inside text-gray-400 space-y-1 text-sm">
            <li>Screenshot this page</li>
            <li>Also visit <a href="/api/health/storage" className="text-blue-400 underline">/api/health/storage</a> and copy the JSON</li>
            <li>Check browser console (F12) for any CSP or CORS errors</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
