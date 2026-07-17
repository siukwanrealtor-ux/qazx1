import { useEffect, useState, useCallback } from "react";

export interface Route {
  path: string;
  params: Record<string, string>;
  query: URLSearchParams;
  hash: string;
  search: URLSearchParams;
}

function parseHash(): Route {
  const raw = window.location.hash.slice(1) || "/";
  const [pathPart, queryPart] = raw.split("?");
  const segments = pathPart.split("/").filter(Boolean);
  const params: Record<string, string> = {};

  // Routes: /, /setup-password, /agent/dashboard, /client/:id, /client/:id/profile
  if (segments[0] === "client" && segments[1]) {
    params.clientId = segments[1];
    if (segments[2] === "profile") {
      params.view = "profile";
    }
  }

  return {
    path: pathPart || "/",
    params,
    query: new URLSearchParams(queryPart || ""),
    hash: raw,
    search: new URLSearchParams(window.location.search),
  };
}

export function useRouter() {
  const [route, setRoute] = useState<Route>(parseHash);

  useEffect(() => {
    const onChange = () => setRoute(parseHash());
    window.addEventListener("hashchange", onChange);
    window.addEventListener("popstate", onChange);
    return () => {
      window.removeEventListener("hashchange", onChange);
      window.removeEventListener("popstate", onChange);
    };
  }, []);

  const navigate = useCallback((to: string) => {
    window.location.hash = to;
  }, []);

  return { route, navigate };
}
