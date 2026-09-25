package com.snapforge.data

import androidx.room.*

/**
 * Room entity for a completed forge (layout → TSX generation).
 */
@Entity(tableName = "forges")
data class ForgeEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    @ColumnInfo(name = "surface_name") val surfaceName: String,
    @ColumnInfo(name = "layout_hash") val layoutHash: String,
    @ColumnInfo(name = "created_at") val createdAt: Long = System.currentTimeMillis(),
    @ColumnInfo(name = "node_count") val nodeCount: Int = 0,
    @ColumnInfo(name = "unresolved_count") val unresolvedCount: Int = 0,
    @ColumnInfo(name = "latency_ms") val latencyMs: Long = 0,
    @ColumnInfo(name = "accelerator") val accelerator: String = "cpu"
)

/**
 * Room entity for a stored layout JSON document.
 */
@Entity(tableName = "layouts")
data class LayoutEntity(
    @PrimaryKey @ColumnInfo(name = "hash") val hash: String,
    @ColumnInfo(name = "json_blob") val jsonBlob: String,
    @ColumnInfo(name = "created_at") val createdAt: Long = System.currentTimeMillis()
)

/**
 * Room entity for voice-edit patch history (RFC 6902 patches applied).
 */
@Entity(tableName = "patch_history")
data class PatchHistoryEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    @ColumnInfo(name = "forge_id") val forgeId: Long,
    @ColumnInfo(name = "patch_json") val patchJson: String,
    @ColumnInfo(name = "applied_at") val appliedAt: Long = System.currentTimeMillis(),
    @ColumnInfo(name = "rejected_ops") val rejectedOps: Int = 0
)

@Dao
interface ForgeDao {
    @Insert
    suspend fun insert(forge: ForgeEntity): Long

    @Query("SELECT * FROM forges ORDER BY created_at DESC LIMIT :limit")
    suspend fun getRecent(limit: Int = 50): List<ForgeEntity>

    @Query("SELECT * FROM forges WHERE id = :id")
    suspend fun getById(id: Long): ForgeEntity?
}

@Dao
interface LayoutDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(layout: LayoutEntity)

    @Query("SELECT * FROM layouts WHERE hash = :hash")
    suspend fun getByHash(hash: String): LayoutEntity?
}

@Dao
interface PatchHistoryDao {
    @Insert
    suspend fun insert(patch: PatchHistoryEntity): Long

    @Query("SELECT * FROM patch_history WHERE forge_id = :forgeId ORDER BY applied_at ASC")
    suspend fun getForForge(forgeId: Long): List<PatchHistoryEntity>
}

@Database(
    entities = [ForgeEntity::class, LayoutEntity::class, PatchHistoryEntity::class],
    version = 1,
    exportSchema = false
)
abstract class SnapForgeDatabase : RoomDatabase() {
    abstract fun forgeDao(): ForgeDao
    abstract fun layoutDao(): LayoutDao
    abstract fun patchHistoryDao(): PatchHistoryDao
}
