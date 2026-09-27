package dev.worldcombat.core.client.particles;

import com.google.gson.JsonParser;

/** Native audio dispatch stays client-side; these checks cover authored cue ownership and parsing. */
public final class SoundCueChecks {
    public static void main(String[] args) {
        String emitter = "\"emitters\":[{\"name\":\"point\",\"particle\":\"fixture:point\",\"bind\":\"point\",\"rate\":1,\"lifetime\":2,\"size\":1}]";
        var definition = DefinitionParser.parse("fixture:cue", 1, JsonParser.parseString("{\"moments\":{"
            + "\"first\":{\"sound\":{\"id\":\"minecraft:block.note_block.bass\",\"volume\":0.6,\"pitch\":0.8}," + emitter + "},"
            + "\"second\":{\"sound\":{\"id\":\"minecraft:block.note_block.bass\",\"pitch\":1.2}," + emitter + "}}}"));
        var entry = JsonParser.parseString("{\"key\":\"fixture:1\",\"position\":[2,3,4],\"data\":{\"moment\":\"first\"}}").getAsJsonObject();
        var instance = new ParticleInstance("fixture:1", definition, entry, (key, message) -> { throw new AssertionError(message); });
        var cue = instance.takeSound();
        require(cue != null && cue.position().x == 2 && cue.cue().pitch() == .8, "authored sound and actual point");
        require(instance.takeSound() == null, "same frame/tick cannot repeat");
        instance.touch(entry, 1);
        require(instance.takeSound() == null, "payload refresh cannot repeat");
        instance.switchMoment("second");
        require(instance.takeSound().cue().pitch() == 1.2, "next phase has its own cue");
        instance.switchMoment("first");
        instance.interrupt();
        require(instance.takeSound() == null, "released phase has no late cue");
        System.out.println("SoundCueChecks PASS: once per phase, stable refresh, independent phase, interruption and point");
    }
    private static void require(boolean condition, String message) { if (!condition) throw new AssertionError(message); }
}
