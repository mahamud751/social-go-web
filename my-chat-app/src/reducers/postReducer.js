const initialState = {
  posts: [],
  comments: [],
  stories: [],
};

const postReducer = (state = initialState, action) => {
  switch (action.type) {
    case "NEW_POST":
      return {
        ...state,
        posts: [action.data, ...state.posts],
      };
    case "UPDATE_POST_REACTION":
      return {
        ...state,
        posts: state.posts.map((post) =>
          post.ID === action.data.postId
            ? { ...post, Reactions: action.data.reactions }
            : post
        ),
      };
    case "NEW_COMMENT":
      return {
        ...state,
        posts: state.posts.map((post) =>
          post.ID === action.data.postId
            ? { ...post, CommentCount: (post.CommentCount || 0) + 1 }
            : post
        ),
        comments: [{ ...action.data, type: "new-comment" }, ...state.comments],
      };
    case "NEW_REPLY":
      return {
        ...state,
        posts: state.posts.map((post) =>
          post.ID === action.data.postId
            ? { ...post, CommentCount: (post.CommentCount || 0) + 1 }
            : post
        ),
        comments: [{ ...action.data, type: "new-reply" }, ...state.comments],
      };
    case "UPDATE_COMMENT_REACTION":
      return {
        ...state,
        comments: state.comments.map((comment) =>
          comment.ID === action.data.commentId
            ? {
                ...comment,
                Reactions: action.data.reactions,
                type: "comment-reaction-update",
              }
            : comment
        ),
      };
    case "NEW_STORY":
      return {
        ...state,
        stories: [action.data, ...state.stories],
      };
    default:
      return state;
  }
};

export default postReducer;
