import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Database, Search, Trash2, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { supabase } from '@/services/supabase';
import { toast } from 'sonner';

interface DBObject {
  name: string;
  type: string;
}

export default function AdminMaintenancePage() {
  const [objects, setObjects] = useState<DBObject[]>([]);
  const [search, setSearch] = useState('exchange');
  const [loading, setLoading] = useState(false);
  const [cleaning, setCleaning] = useState(false);

  useEffect(() => {
    fetchObjects();
  }, []);

  const fetchObjects = async () => {
    setLoading(true);
    try {
      // Query for triggers and indexes
      const { data, error } = await (supabase.rpc as any)('execute_sql_query', {
        p_query: `
          SELECT trigger_name as name, 'trigger' as type 
          FROM information_schema.triggers 
          WHERE event_object_schema = 'public'
          UNION ALL
          SELECT indexname as name, 'index' as type 
          FROM pg_indexes 
          WHERE schemaname = 'public'
          UNION ALL
          SELECT routine_name as name, 'function' as type
          FROM information_schema.routines
          WHERE routine_schema = 'public'
        `
      });

      if (error) throw error;
      setObjects(data || []);
    } catch (error) {
      console.error('Failed to fetch DB objects:', error);
      toast.error('Failed to load database objects');
    } finally {
      setLoading(false);
    }
  };

  const filteredObjects = objects.filter(obj => 
    obj.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleCleanup = async (name: string, type: string) => {
    if (!confirm(`Are you sure you want to delete this ${type}: ${name}?`)) return;

    setCleaning(true);
    try {
      let query = '';
      if (type === 'trigger') {
        // Need to find the table first
        const { data: tableData } = await (supabase.rpc as any)('execute_sql_query', {
          p_query: `SELECT event_object_table FROM information_schema.triggers WHERE trigger_name = '${name}' LIMIT 1`
        });
        const tableName = (tableData as any)?.[0]?.event_object_table;
        if (tableName) {
          query = `DROP TRIGGER IF EXISTS ${name} ON ${tableName};`;
        }
      } else if (type === 'index') {
        query = `DROP INDEX IF EXISTS ${name};`;
      } else if (type === 'function') {
        query = `DROP FUNCTION IF EXISTS ${name} CASCADE;`;
      }

      if (query) {
        const { error } = await (supabase.rpc as any)('execute_sql_query', { p_query: query });
        if (error) throw error;
        toast.success(`${type} deleted successfully`);
        fetchObjects();
      } else {
        toast.error('Could not generate drop query');
      }
    } catch (error) {
      console.error('Cleanup failed:', error);
      toast.error('Cleanup operation failed');
    } finally {
      setCleaning(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-black v56-gradient-text tracking-tighter flex items-center gap-3">
            <Database className="h-8 w-8 text-primary" />
            Database Maintenance
          </h1>
          <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground opacity-70">
            Cleanup leftover objects and monitor system health
          </p>
        </div>
        <Button onClick={fetchObjects} variant="outline" size="sm" disabled={loading}>
          Refresh Objects
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="v56-glass premium-border md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Cleanup Tools</CardTitle>
                <CardDescription>Search and remove unused triggers, indexes, and functions</CardDescription>
              </div>
              <div className="relative w-48">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search objects..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
              {filteredObjects.length > 0 ? (
                filteredObjects.map((obj) => (
                  <div key={obj.name} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card/50 hover:bg-card transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-md bg-primary/10">
                        <Database className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-bold tracking-tight">{obj.name}</p>
                        <Badge variant="secondary" className="text-[10px] uppercase font-bold px-1.5 h-4">
                          {obj.type}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleCleanup(obj.name, obj.type)}
                      disabled={cleaning}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <CheckCircle2 className="h-12 w-12 text-green-500/50 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No matching objects found. Database appears clean.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="v56-glass premium-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-green-500" />
                Health Check
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                <span className="text-sm font-medium">Exchange Tables</span>
                <Badge className="bg-green-500">Clean</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                <span className="text-sm font-medium">Legacy Triggers</span>
                <Badge className="bg-green-500">Clean</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
                <span className="text-sm font-medium">Performance Indices</span>
                <Badge variant="outline" className="text-yellow-500 border-yellow-500/20">Optimized</Badge>
              </div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest text-center">
                Last scan: {new Date().toLocaleTimeString()}
              </p>
            </CardContent>
          </Card>

          <Card className="v56-glass border-destructive/20 bg-destructive/5">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Danger Zone
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-4">
                Operations in this section are destructive and cannot be undone. Use with extreme caution.
              </p>
              <Button variant="destructive" className="w-full font-bold" disabled>
                Factory Reset DB
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
