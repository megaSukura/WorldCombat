package dev.worldcombat.core.world;

import dev.worldcombat.core.runtime.effect.EffectRuntime;
import net.minecraft.core.HolderLookup;
import net.minecraft.nbt.*;
import net.minecraft.world.level.saveddata.SavedData;
import java.util.*;

/** World-owned storage envelope; native individual data continues to belong to its domain. */
final class EffectSavedData extends SavedData {
    static final Factory<EffectSavedData> FACTORY = new Factory<>(EffectSavedData::new, EffectSavedData::read);
    private List<String> saved = List.of();
    private EffectRuntime runtime;
    private static EffectSavedData read(CompoundTag tag, HolderLookup.Provider provider) {
        var data = new EffectSavedData();
        int schema = tag.getInt("Schema");
        if (schema != 1 && schema != 2) throw new IllegalArgumentException("Unsupported world combat effect storage schema");
        var entries = tag.getList("Effects", schema == 1 ? Tag.TAG_STRING : Tag.TAG_COMPOUND);
        var values = new ArrayList<String>();
        for (int index = 0; index < entries.size(); index++) values.add(schema == 1 ? entries.getString(index) : NbtJson.read(entries.getCompound(index).get("Data")));
        data.saved = List.copyOf(values);
        return data;
    }
    void attach(EffectRuntime runtime) { this.runtime = runtime; runtime.load(saved); saved = List.of(); }
    @Override public CompoundTag save(CompoundTag tag, HolderLookup.Provider provider) {
        tag.putInt("Schema", 2);
        var values = new ListTag();
        for (var json : runtime == null ? saved : runtime.snapshot()) { var entry = new CompoundTag(); entry.put("Data", NbtJson.write(json)); values.add(entry); }
        tag.put("Effects", values);
        return tag;
    }
}
