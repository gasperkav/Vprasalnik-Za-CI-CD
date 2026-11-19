import React, { useEffect, useState } from 'react';
import Assessment1 from './Assessment1.jsx';
import Assessment4 from './Assessment4.jsx';

export default function AssessmentWrapper(props) {
  const { currentAssessmentId, initialName = '', initialRepoLink = '', pipelines } = props;
  const saved = currentAssessmentId && pipelines.find(p => String(p.id) === String(currentAssessmentId));
  const name = saved ? saved.name || '' : initialName;
  const repoLink = saved ? saved.repoLink || '' : initialRepoLink;
  const key = JSON.stringify([currentAssessmentId, name, repoLink]);

  return (
    <AssessmentDraft
      key={key}
      {...props}
      initialName={name}
      initialRepoLink={repoLink}
      repoId={saved?.repoId || ''}
    />
  );
}

function AssessmentDraft({ viewType = 'collapsible', initialName, initialRepoLink, repoId, ...props }) {
  // The two layouts can remount independently of the assessment being edited.
  const [name, setName] = useState(initialName);
  const [repoLink, setRepoLink] = useState(initialRepoLink);
  const { onRepoLinkChange } = props;

  useEffect(() => {
    onRepoLinkChange?.(initialRepoLink);
  }, [initialRepoLink, onRepoLinkChange]);

  const AssessmentComponent = viewType === 'tabs' ? Assessment4 : Assessment1;
  return (
    <AssessmentComponent
      {...props}
      name={name}
      setName={setName}
      repoId={repoId}
      repoLink={repoLink}
      setRepoLink={setRepoLink}
    />
  );
}
