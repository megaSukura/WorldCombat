package dev.worldcombat.core.runtime;

/** Host resource adapter. Guard native access with ActionContext.checkCostAccess.
 * Prepare reads only; apply writes; rollback restores an attempted write.
 * Quantities and the decision to attach a cost belong to the calling content. */
public interface CommitCost {
    String key();
    void prepare(ActionContext action);
    void apply();
    void rollback();
}
