import { useState, useEffect } from 'react';

interface SearchResult {
  id: string;
  name: string;
  description: string;
}

const searchService = {
  search: async (query: string): Promise<SearchResult[]> => {
    const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    if (!response.ok) {
      throw new Error('Search failed');
    }
    return response.json();
  },

  getById: async (id: string): Promise<SearchResult> => {
    const response = await fetch(`/api/search/${id}`);
    if (!response.ok) {
      throw new Error('Search failed');
    }
    return response.json();
  }
};

export default searchService;