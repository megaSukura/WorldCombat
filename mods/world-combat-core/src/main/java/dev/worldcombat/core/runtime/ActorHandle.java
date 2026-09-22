package dev.worldcombat.core.runtime;

import java.util.UUID;

public record ActorHandle(String domain, UUID identity, UUID entity, long generation) {
    public String key() { return domain + ":" + identity; }
    public String ref() { return entity + "/" + generation; }
}
