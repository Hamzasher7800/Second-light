import { useState, useEffect } from 'react';
import { Document, DocumentDetail, documentService } from '@/services/documentService';
import { toast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';

export function useDocuments() {
  const { 
    data: documents,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['documents'],
    queryFn: documentService.getDocuments,
    gcTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchOnMount: true, // Refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window regains focus
    meta: {
      onError: (error: Error) => {
        console.error('Error fetching documents:', error);
        // Don't show toast for network errors or auth errors, as these are common
        // when a user is not logged in or has network issues
        if (!error.message.includes('Network') && !error.message.includes('auth')) {
          toast({
            title: "Error",
            description: "There was a problem loading your documents",
            variant: "destructive",
          });
        }
      }
    }
  });
  
  const errorMessage = error instanceof Error ? error.message : String(error);

  return {
    documents: documents || [],
    isLoading,
    error: errorMessage || null,
    refetchDocuments: refetch
  };
}

export function useDocumentDetail(id: string) {
  const { 
    data: document,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['document', id],
    queryFn: () => documentService.getDocumentById(id),
    enabled: !!id,
    gcTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchInterval: (query) => {
      const data = query.state.data;
      // Automatically poll if document is still processing
      if (data?.processing_status === 'processing' || 
          data?.processing_status === 'pending' ||
          data?.status === 'Processing') {
        return 5000; // Poll every 5 seconds
      }
      return false; // Don't poll for completed documents
    },
    meta: {
      onError: (error: Error) => {
        console.error('Error fetching document details:', error);
        toast({
          title: "Error", 
          description: "There was a problem loading this document",
          variant: "destructive",
        });
      }
    }
  });
  
  const errorMessage = error instanceof Error ? error.message : error ? String(error) : null;

  return {
    document,
    isLoading,
    error: errorMessage || null,
    refetchDocument: refetch
  };
}
