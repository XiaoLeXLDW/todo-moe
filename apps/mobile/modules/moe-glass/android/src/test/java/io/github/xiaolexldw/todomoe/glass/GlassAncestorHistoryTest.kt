package io.github.xiaolexldw.todomoe.glass

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class GlassAncestorHistoryTest {
  private class Node(var parent: Node? = null)

  @Test fun removedGlassStillExcludesItsFormerContainersFromWholeSubtreeDrawing() {
    val root = Node()
    val screen = Node(root)
    val glass = Node(screen)
    val ordinaryContent = Node(root)
    val history = GlassAncestorHistory<Node>()
    history.markAncestors(glass) { it.parent }
    // A transition keeps an old native child list after public removal.
    glass.parent = null
    assertTrue(history.requiresPartition(screen, containsGlassNow = false))
    assertTrue(history.requiresPartition(root, containsGlassNow = false))
    assertFalse(history.requiresPartition(ordinaryContent, containsGlassNow = false))
    assertTrue(history.requiresPartition(ordinaryContent, containsGlassNow = true))
  }

  @Test fun attachmentChangesTheExclusionRevisionBeforeAConsumerCanReuseAnOldFrame() {
    val history = GlassAncestorHistory<Node>()
    val cachedFrameRevision = history.revision
    val root = Node()
    val glass = Node(Node(root))
    history.markAncestors(glass) { it.parent }
    assertTrue(history.revision > cachedFrameRevision)
    val refreshedFrameRevision = history.revision
    history.markAncestors(glass) { it.parent }
    assertEquals(refreshedFrameRevision, history.revision)
  }

  @Test fun reparentingAnAlreadyMarkedContainerAlsoExcludesItsNewAncestors() {
    val history = GlassAncestorHistory<Node>()
    val oldRoot = Node()
    val container = Node(oldRoot)
    val glass = Node(container)
    history.markAncestors(glass) { it.parent }
    val previous = history.revision
    val newRoot = Node()
    container.parent = newRoot
    history.markAncestors(glass) { it.parent }
    assertTrue(history.revision > previous)
    assertTrue(history.requiresPartition(oldRoot, false))
    assertTrue(history.requiresPartition(newRoot, false))
    assertTrue(history.requiresPartition(container, false))
  }
}
