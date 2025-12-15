/**
 * SupabaseClient - Database client for AI-COUNCIL
 * Handles all database operations with Supabase
 */

const { createClient } = require('@supabase/supabase-js');

class SupabaseClient {
    constructor(config = {}) {
        this.config = {
            url: config.url || process.env.SUPABASE_URL,
            key: config.key || process.env.SUPABASE_ANON_KEY,
            ...config
        };

        if (!this.config.url || !this.config.key) {
            throw new Error('Supabase URL and key are required');
        }

        this.client = createClient(this.config.url, this.config.key);
        this.connected = false;
    }

    /**
     * Test database connection
     */
    async connect() {
        try {
            // Test connection with a simple query
            const { data, error } = await this.client
                .from('code_submissions')
                .select('count')
                .limit(1);

            if (error && error.code !== 'PGRST116') { // PGRST116 = table doesn't exist (acceptable)
                throw error;
            }

            this.connected = true;
            console.log('✅ Connected to Supabase database');
            return true;
        } catch (error) {
            console.error('❌ Failed to connect to Supabase:', error.message);
            this.connected = false;
            throw error;
        }
    }

    /**
     * Insert a record into a table
     */
    async insert(table, data) {
        try {
            const { data: result, error } = await this.client
                .from(table)
                .insert(data)
                .select()
                .single();

            if (error) throw error;
            return result;
        } catch (error) {
            console.error(`❌ Insert failed for table ${table}:`, error.message);
            throw error;
        }
    }

    /**
     * Select records from a table
     */
    async select(table, filters = {}, options = {}) {
        try {
            let query = this.client.from(table).select(options.select || '*');

            // Apply filters
            Object.entries(filters).forEach(([key, value]) => {
                query = query.eq(key, value);
            });

            // Apply options
            if (options.limit) query = query.limit(options.limit);
            if (options.order) query = query.order(options.order.column, { ascending: options.order.ascending });

            const { data, error } = await query;
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error(`❌ Select failed for table ${table}:`, error.message);
            throw error;
        }
    }

    /**
     * Select a single record
     */
    async selectOne(table, filters = {}) {
        const results = await this.select(table, filters, { limit: 1 });
        return results.length > 0 ? results[0] : null;
    }

    /**
     * Update records in a table
     */
    async update(table, filters, updates) {
        try {
            let query = this.client.from(table).update(updates);

            // Apply filters
            Object.entries(filters).forEach(([key, value]) => {
                query = query.eq(key, value);
            });

            const { data, error } = await query.select();
            if (error) throw error;
            return data;
        } catch (error) {
            console.error(`❌ Update failed for table ${table}:`, error.message);
            throw error;
        }
    }

    /**
     * Delete records from a table
     */
    async delete(table, filters) {
        try {
            let query = this.client.from(table);

            // Apply filters
            Object.entries(filters).forEach(([key, value]) => {
                query = query.delete().eq(key, value);
            });

            const { data, error } = await query;
            if (error) throw error;
            return data;
        } catch (error) {
            console.error(`❌ Delete failed for table ${table}:`, error.message);
            throw error;
        }
    }

    /**
     * Execute raw SQL query
     */
    async query(sql, params = []) {
        try {
            const { data, error } = await this.client.rpc('execute_sql', {
                query: sql,
                params: params
            });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('❌ Raw query failed:', error.message);
            throw error;
        }
    }

    /**
     * Initialize database schema
     */
    async initializeSchema() {
        try {
            console.log('🔧 Initializing database schema...');

            // Create tables using SQL
            const schema = `
                -- Code submissions tracking
                CREATE TABLE IF NOT EXISTS code_submissions (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    file_path TEXT NOT NULL,
                    code_content TEXT NOT NULL,
                    language TEXT NOT NULL,
                    project_id UUID NOT NULL,
                    is_ai_generated BOOLEAN DEFAULT true,
                    lines_of_code INTEGER,
                    complexity_score INTEGER,
                    metadata JSONB,
                    created_at TIMESTAMP DEFAULT NOW()
                );

                -- Individual agent ratings
                CREATE TABLE IF NOT EXISTS agent_ratings (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    submission_id UUID REFERENCES code_submissions(id),
                    agent_name TEXT NOT NULL,
                    score INTEGER CHECK (score >= 0 AND score <= 100),
                    confidence DECIMAL CHECK (confidence >= 0 AND confidence <= 1),
                    issues JSONB,
                    reasoning TEXT,
                    execution_time_ms INTEGER,
                    created_at TIMESTAMP DEFAULT NOW()
                );

                -- Final council assessments
                CREATE TABLE IF NOT EXISTS code_assessments (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    submission_id UUID REFERENCES code_submissions(id),
                    final_score INTEGER CHECK (final_score >= 0 AND final_score <= 100),
                    status TEXT CHECK (status IN ('APPROVED', 'REJECTED', 'REVIEW_NEEDED')),
                    consensus_score DECIMAL,
                    agent_agreement JSONB,
                    recommendations JSONB,
                    auto_approved BOOLEAN DEFAULT false,
                    created_at TIMESTAMP DEFAULT NOW()
                );

                -- Production patterns for learning
                CREATE TABLE IF NOT EXISTS production_patterns (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    pattern_type TEXT NOT NULL,
                    code_pattern TEXT NOT NULL,
                    language TEXT NOT NULL,
                    pattern_hash TEXT UNIQUE,
                    frequency INTEGER DEFAULT 1,
                    avg_rating INTEGER,
                    success_rate DECIMAL,
                    context_tags TEXT[],
                    learned_from UUID[],
                    last_seen TIMESTAMP DEFAULT NOW(),
                    created_at TIMESTAMP DEFAULT NOW()
                );

                -- Agent learning and performance tracking
                CREATE TABLE IF NOT EXISTS agent_performance (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    agent_name TEXT NOT NULL,
                    total_predictions INTEGER DEFAULT 0,
                    correct_predictions INTEGER DEFAULT 0,
                    accuracy DECIMAL GENERATED ALWAYS AS (
                        CASE WHEN total_predictions > 0 
                        THEN correct_predictions::decimal / total_predictions 
                        ELSE 0 END
                    ) STORED,
                    current_weight DECIMAL DEFAULT 1.0,
                    learned_patterns JSONB,
                    last_updated TIMESTAMP DEFAULT NOW()
                );

                -- Project configurations
                CREATE TABLE IF NOT EXISTS projects (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    name TEXT NOT NULL,
                    root_path TEXT NOT NULL,
                    language_config JSONB,
                    agent_weights JSONB,
                    thresholds JSONB,
                    team_patterns JSONB,
                    created_at TIMESTAMP DEFAULT NOW()
                );

                -- Create indexes for performance
                CREATE INDEX IF NOT EXISTS idx_code_submissions_project_id ON code_submissions(project_id);
                CREATE INDEX IF NOT EXISTS idx_code_submissions_language ON code_submissions(language);
                CREATE INDEX IF NOT EXISTS idx_agent_ratings_submission_id ON agent_ratings(submission_id);
                CREATE INDEX IF NOT EXISTS idx_agent_ratings_agent_name ON agent_ratings(agent_name);
                CREATE INDEX IF NOT EXISTS idx_code_assessments_submission_id ON code_assessments(submission_id);
                CREATE INDEX IF NOT EXISTS idx_code_assessments_status ON code_assessments(status);
                CREATE INDEX IF NOT EXISTS idx_production_patterns_language ON production_patterns(language);
                CREATE INDEX IF NOT EXISTS idx_production_patterns_pattern_type ON production_patterns(pattern_type);
            `;

            // Execute schema creation (this would need to be done via Supabase SQL editor or migration)
            console.log('📋 Schema SQL ready. Please execute this in your Supabase SQL editor:');
            console.log(schema);
            
            return schema;
        } catch (error) {
            console.error('❌ Schema initialization failed:', error.message);
            throw error;
        }
    }

    /**
     * Get database statistics
     */
    async getStats() {
        try {
            const stats = {};

            // Get table counts
            const tables = ['code_submissions', 'agent_ratings', 'code_assessments', 'production_patterns'];
            
            for (const table of tables) {
                const { count } = await this.client
                    .from(table)
                    .select('*', { count: 'exact', head: true });
                stats[table] = count || 0;
            }

            return stats;
        } catch (error) {
            console.error('❌ Failed to get database stats:', error.message);
            return {};
        }
    }

    /**
     * Health check
     */
    async healthCheck() {
        try {
            const start = Date.now();
            await this.client.from('code_submissions').select('count').limit(1);
            const responseTime = Date.now() - start;

            return {
                connected: true,
                responseTime,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                connected: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
}

module.exports = { SupabaseClient };