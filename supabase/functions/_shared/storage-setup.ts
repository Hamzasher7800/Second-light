
export async function ensureStorageBucketExists(
  supabaseUrl: string,
  serviceRoleKey: string
): Promise<void> {
  try {
    // Create a client with the service role key
    const response = await fetch(`${supabaseUrl}/rest/v1/storage/buckets`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey
      }
    });

    const buckets = await response.json();
    const documentsExists = buckets.some((bucket: any) => bucket.name === 'documents');
    
    if (!documentsExists) {
      // Create the documents bucket if it doesn't exist
      const createResponse = await fetch(`${supabaseUrl}/rest/v1/storage/buckets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey
        },
        body: JSON.stringify({
          id: 'documents',
          name: 'documents',
          public: false
        })
      });

      if (!createResponse.ok) {
        throw new Error(`Failed to create documents bucket: ${createResponse.statusText}`);
      }
      
      // Add bucket policy to allow authenticated users to upload their own files
      const policyResponse = await fetch(`${supabaseUrl}/rest/v1/storage/buckets/documents/policies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey
        },
        body: JSON.stringify({
          name: 'User Documents Policy',
          definition: {
            resource: 'documents',
            statements: [
              {
                effect: 'allow',
                principal: {'authenticated': '*'},
                operation: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
                condition: {'owner_id_match': {'auth.uid()': 'owner'}}
              }
            ]
          }
        })
      });

      if (!policyResponse.ok) {
        console.error('Failed to create storage policy for documents bucket');
      }
    }
  } catch (error) {
    console.error('Error ensuring storage bucket exists:', error);
  }
}
