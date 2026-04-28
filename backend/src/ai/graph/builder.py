from __future__ import annotations

from langgraph.checkpoint.base import BaseCheckpointSaver
from langgraph.graph import END, StateGraph

from src.ai.graph.nodes.await_human_review import await_human_review
from src.ai.graph.nodes.extract_metadata import extract_metadata
from src.ai.graph.nodes.generate_draft import generate_draft
from src.ai.graph.nodes.refine import refine
from src.ai.graph.nodes.translate import fan_out_translations, translate_to_language
from src.ai.graph.state import ContentWorkflowState


def route_after_review(state: ContentWorkflowState) -> str:
    """Route after human review: loop to refine or end."""
    feedback = state.get("pending_feedback")
    if (
        feedback is not None
        and feedback["action"] == "regenerate"
        and state["iteration"] < 5
        and state["status"] != "failed"
    ):
        return "refine"
    return "done"


def build_graph(checkpointer: BaseCheckpointSaver) -> object:
    """Compile the content workflow StateGraph with the given checkpointer."""
    builder: StateGraph = StateGraph(ContentWorkflowState)

    builder.add_node("generate_draft", generate_draft)
    builder.add_node("extract_metadata", extract_metadata)
    builder.add_node("translate_to_language", translate_to_language)
    builder.add_node("await_human_review", await_human_review)
    builder.add_node("refine", refine)

    builder.set_entry_point("generate_draft")
    builder.add_edge("generate_draft", "extract_metadata")

    # Fan-out: one parallel branch per target language
    builder.add_conditional_edges(
        "extract_metadata",
        fan_out_translations,
        ["translate_to_language"],
    )
    builder.add_edge("translate_to_language", "await_human_review")

    builder.add_conditional_edges(
        "await_human_review",
        route_after_review,
        {"refine": "refine", "done": END},
    )
    # After refinement, re-extract metadata and re-translate
    builder.add_edge("refine", "extract_metadata")

    return builder.compile(checkpointer=checkpointer)
