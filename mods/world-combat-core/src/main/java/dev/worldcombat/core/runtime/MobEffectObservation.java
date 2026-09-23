package dev.worldcombat.core.runtime;

/** One active Minecraft effect instance; `tags` are the effect type's registry tags, space-separated. */
public record MobEffectObservation(String id, int duration, int amplifier, String key, String tags, String category) {
    public boolean tagged(String tag) {
        if (tag == null || tag.isEmpty()) return false;
        for (var value : tags.split(" ")) if (value.equals(tag)) return true;
        return false;
    }
}
